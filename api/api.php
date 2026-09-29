<?php
header("Content-Type: application/json");
require_once 'db.php';

$action = $_GET['action'] ?? '';

// 1. Get all projects
if ($action === 'get_projects') {
    $stmt = $pdo->query("SELECT id, project_name FROM projects ORDER BY id DESC");
    echo json_encode($stmt->fetchAll());
    exit;
}

// 2. Create a new project (auto-creates Web, API, and Server items)
if ($action === 'create_project') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = trim($data['project_name'] ?? '');

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(["error" => "Name cannot be empty"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO projects (project_name) VALUES (:name)");
        $stmt->execute([':name' => $name]);
        $projectId = $pdo->lastInsertId();

        $scopes = ['Web', 'API', 'Server'];
        foreach ($scopes as $scope) {
            // Create subproject
            $subStmt = $pdo->prepare("INSERT INTO subprojects (project_id, subproject_type) VALUES (:pid, :scope)");
            $subStmt->execute([':pid' => $projectId, ':scope' => $scope]);
            $subId = $pdo->lastInsertId();

            // Populate items from master_templates (leaving status/notes empty)
            $cloneStmt = $pdo->prepare("
                INSERT INTO checklist_items (subproject_id, name, description, tool)
                SELECT :sub_id, name, description, tool
                FROM master_templates
                WHERE scope_type = :scope
            ");
            $cloneStmt->execute([':sub_id' => $subId, ':scope' => $scope]);
        }

        $pdo->commit();
        echo json_encode(["success" => true, "project_id" => $projectId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}

// 3. Delete a project
if ($action === 'delete_project') {
    $data = json_decode(file_get_contents('php://input'), true);
    $projectId = $data['project_id'] ?? null;

    if ($projectId) {
        $stmt = $pdo->prepare("DELETE FROM projects WHERE id = :id");
        $stmt->execute([':id' => $projectId]);
        echo json_encode(["success" => true]);
    }
    exit;
}

// 4. Get checklist items for a selected project and scope (Web, API, Server)
if ($action === 'get_checklist') {
    $projectId = $_GET['project_id'] ?? null;
    $scope = $_GET['scope'] ?? 'Web';

    if (!$projectId) {
        echo json_encode([]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT c.* 
        FROM checklist_items c
        JOIN subprojects s ON c.subproject_id = s.id
        WHERE s.project_id = :pid AND s.subproject_type = :scope
        ORDER BY c.id ASC
    ");
    $stmt->execute([':pid' => $projectId, ':scope' => $scope]);
    echo json_encode($stmt->fetchAll());
    exit;
}

// 5. Update a single checklist row (Save changes)
if ($action === 'update_item') {
    $data = json_decode(file_get_contents('php://input'), true);

    $stmt = $pdo->prepare("
        UPDATE checklist_items 
        SET vuln_url = :url, progress = :progress, status = :status, methodology = :methodology
        WHERE id = :id
    ");
    $stmt->execute([
        ':url'         => $data['vuln_url'],
        ':progress'    => $data['progress'],
        ':status'      => $data['status'],
        ':methodology' => $data['methodology'],
        ':id'          => $data['item_id']
    ]);

    echo json_encode(["success" => true]);
    exit;
}
// Add new item to master template catalog
if ($action === 'add_template') {
    $data = json_decode(file_get_contents('php://input'), true);

    $stmt = $pdo->prepare("
        INSERT INTO master_templates (scope_type, name, description, tool)
        VALUES (:scope, :name, :description, :tool)
    ");
    $stmt->execute([
        ':scope'       => $data['scope_type'],
        ':name'        => trim($data['name']),
        ':description' => trim($data['description']),
        ':tool'        => trim($data['tool'])
    ]);

    echo json_encode(["success" => true]);
    exit;
}

// 6. Sync new master template items into an existing project
if ($action === 'sync_project') {
    $data = json_decode(file_get_contents('php://input'), true);
    $projectId = $data['project_id'] ?? null;

    if (!$projectId) {
        http_response_code(400);
        echo json_encode(["error" => "Project ID is required"]);
        exit;
    }

    try {
        $scopes = ['Web', 'API', 'Server'];
        $addedCount = 0;

        foreach ($scopes as $scope) {
            // Find the subproject_id for this project and scope
            $subStmt = $pdo->prepare("SELECT id FROM subprojects WHERE project_id = :pid AND subproject_type = :scope");
            $subStmt->execute([':pid' => $projectId, ':scope' => $scope]);
            $subproject = $subStmt->fetch();

            if ($subproject) {
                $subId = $subproject['id'];

                // Insert only master items that are NOT already in this subproject's checklist
                $syncSql = "
                    INSERT INTO checklist_items (subproject_id, name, description, tool)
                    SELECT :sub_id, m.name, m.description, m.tool
                    FROM master_templates m
                    WHERE m.scope_type = :scope
                      AND m.name NOT IN (
                          SELECT c.name FROM checklist_items c WHERE c.subproject_id = :sub_id_check
                      )
                ";
                $syncStmt = $pdo->prepare($syncSql);
                $syncStmt->execute([
                    ':sub_id'       => $subId,
                    ':scope'        => $scope,
                    ':sub_id_check' => $subId
                ]);

                $addedCount += $syncStmt->rowCount();
            }
        }

        echo json_encode(["success" => true, "added" => $addedCount]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
    exit;
}
?>