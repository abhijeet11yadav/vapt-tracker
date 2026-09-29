<div align="center">

```
  ██████╗ ██████╗ ████████╗    ████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗██████╗ 
  ██╔══██╗██╔══██╗╚══██╔══╝    ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
  ██████╔╝██████╔╝   ██║          ██║   ██████╔╝███████║██║     █████═╝ █████╗  ██████╔╝
  ██╔═══╝ ██╔══██╗   ██║          ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
  ██║     ██████╔╝   ██║          ██║   ██║  ██║██║  ██║╚██████╗██║ ╚██╗███████╗██║  ██║
  ╚═╝     ╚═════╝    ╚═╝          ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

### [ ⚡ OFFENSIVE SECURITY WORKFLOW ENGINE ⚡ ]

[![Status: Active](https://img.shields.io/badge/status-active-9cf?style=for-the-badge&logo=hackthebox&logoColor=white&color=9fef00&labelColor=111927)](https://github.com)
[![Platform: XAMPP](https://img.shields.io/badge/platform-XAMPP-orange?style=for-the-badge&logo=apache&logoColor=white&color=eb5424&labelColor=111927)](https://www.apachefriends.org)
[![PHP](https://img.shields.io/badge/backend-PHP-blue?style=for-the-badge&logo=php&logoColor=white&color=777bb4&labelColor=111927)](https://www.php.net/)
[![Database: MySQL](https://img.shields.io/badge/database-MySQL-informational?style=for-the-badge&logo=mysql&logoColor=white&color=4479a1&labelColor=111927)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=for-the-badge&color=9fef00&labelColor=111927)](LICENSE)

*A specialized, methodology-driven engagement workspace for Penetration Testers, Red Teamers, and Security Auditors.*

---

</div>

## 💀 Overview

**VAPT Tracker** is a modular security assessment dashboard engineered to systematically track attack surfaces, audit workflows, and organize findings across **Web Applications**, **APIs**, and **Network/Server Infrastructure**. 

It standardizes engagements into hierarchical scopes:
* `Projects` (Client / Organization Target)
* `Subprojects` (`Web` | `API` | `Server` Scopes)
* `Active Checklist Items` (Real-time finding registers, vulnerability URLs, toolchain references, and remediation states)

---

## 🎯 Architecture & Capabilities

```
+---------------------------------------------------------------------------------+
|                               ENGAGEMENT ROOT                                   |
|                                [ projects ]                                     |
+---------------------------------------+-----------------------------------------+
                                        | (1:N)
                     +------------------+------------------+
                     |          [ subprojects ]            |
                     |  Scopes: Web  |  API  |  Server     |
                     +------------------+------------------+
                                        | (1:N)
                     +------------------+------------------+
                     |       [ checklist_items ]           |
                     | - Execution Status: Pending/Yes/No  |
                     | - Progress: In Progress/Completed   |
                     | - Targeted Vulnerability URLs       |
                     | - Remediation Notes & Tools         |
                     +-------------------------------------+
```

* **Target-Centric Hierarchy:** Group findings per client engagement, dynamically segmented into targeted sub-domains (Web, REST/GraphQL APIs, and Host infrastructure).
* **Pre-Loaded Methodology Library:** Seeded with testing cases aligned with OWASP Top 10, API Security Top 10, and Network Hardening benchmarks.
* **Dual State Engine:** Granular separation between **Execution Progress** (`Not Started`, `In Progress`, `Completed`) and **Finding Status** (`Pending`, `Yes`, `No`, `Recheck`).
* **Toolchain Alignment:** Pre-mapped recommendations for industry staples (`Burp Suite`, `Postman`, `Nmap`, `Hydra`, `LinPEAS`, `ffuf`).

---

## 🗄️ Database Architecture & Initialization

The backend is backed by a relational schema under the database **`vapt_tracker_db`**.

### SQL Setup Script

Run this SQL payload directly inside your MySQL client or via **phpMyAdmin** (`http://localhost/phpmyadmin`):

```sql
-- ========================================================
-- VAPT TRACKER DATABASE SETUP
-- Database: vapt_tracker_db
-- ========================================================

-- 1. Create and select the database
CREATE DATABASE IF NOT EXISTS vapt_tracker_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vapt_tracker_db;

-- 2. Drop old tables if you need a clean reset (in reverse dependency order)
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS master_templates;
DROP TABLE IF EXISTS subprojects;
DROP TABLE IF EXISTS projects;

-- ========================================================
-- TABLE CREATION
-- ========================================================

-- Table 1: Projects (Client Engagements)
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table 2: Subprojects (Web, API, Server scopes per project)
CREATE TABLE subprojects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    subproject_type ENUM('Web', 'API', 'Server') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table 3: Master Templates (Catalog of standard test cases)
CREATE TABLE master_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scope_type ENUM('Web', 'API', 'Server') NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    tool VARCHAR(150)
) ENGINE=InnoDB;

-- Table 4: Active Checklist Items (Findings & Test Results per Subproject)
CREATE TABLE checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subproject_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    tool VARCHAR(150),
    vuln_url VARCHAR(255) DEFAULT '',
    progress ENUM('Not Started', 'In Progress', 'Completed') DEFAULT 'Not Started',
    status ENUM('Pending', 'Yes', 'No', 'Recheck') DEFAULT 'Pending',
    methodology TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subproject_id) REFERENCES subprojects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ========================================================
-- SEED DATA: MASTER TEMPLATES (VAPT Methodology Library)
-- ========================================================

-- Web Vulnerability Checks
INSERT INTO master_templates (scope_type, name, description, tool) VALUES
('Web', 'SQL Injection (SQLi)', 'Test input parameters, forms, and headers for database query manipulation and data extraction.', 'Burp Suite, SQLmap'),
('Web', 'Cross-Site Scripting (XSS)', 'Check for stored, reflected, and DOM-based arbitrary script injection in input fields and query strings.', 'Burp Suite, Browser DevTools'),
('Web', 'Cross-Site Request Forgery (CSRF)', 'Verify anti-CSRF token implementation and validation on state-changing requests.', 'Burp Suite Repeater'),
('Web', 'Insecure Direct Object Reference (IDOR)', 'Test object references (numeric IDs, GUIDs) across different unauthorized user sessions.', 'Burp Suite Autorize, Postman'),
('Web', 'Broken Authentication', 'Evaluate brute-force protection, credential stuffing controls, and session fixation.', 'Burp Suite Intruder, Hydra'),
('Web', 'Server-Side Request Forgery (SSRF)', 'Test external resource fetching endpoints (webhooks, avatar imports) for unauthorized internal network requests.', 'Burp Suite, Interactsh'),
('Web', 'XML External Entity (XXE)', 'Test XML upload and parsing endpoints for external entity expansion and local file inclusion.', 'Burp Suite, Oxygen XML'),
('Web', 'CORS Misconfiguration', 'Check if Access-Control-Allow-Origin accepts arbitrary origins with credentials enabled.', 'Browser DevTools, Burp Suite');

-- API Vulnerability Checks
INSERT INTO master_templates (scope_type, name, description, tool) VALUES
('API', 'Broken Object Level Authorization (BOLA)', 'Attempt unauthorized access to other user objects by changing object IDs in REST parameters.', 'Postman, Burp Suite'),
('API', 'Broken Function Level Authorization (BFLA)', 'Send administrative/privileged API endpoints with low-privileged authentication tokens.', 'Postman, Burp Suite'),
('API', 'Unrestricted Resource Consumption', 'Test rate limiting, request quotas, and execution boundaries on computationally heavy calls.', 'Burp Intruder, Postman Runner'),
('API', 'Mass Assignment', 'Inject privileged parameters (e.g. is_admin: true, role: manager) inside POST/PUT/PATCH JSON bodies.', 'Postman, Burp Suite'),
('API', 'Improper Assets Management', 'Discover unpatched, deprecated API routes (v1, v2) left active without current security controls.', 'ffuf, Burp Suite');

-- Server Vulnerability Checks
INSERT INTO master_templates (scope_type, name, description, tool) VALUES
('Server', 'Open Ports & Services Enumeration', 'Scan target systems to identify exposed management ports, daemon versions, and banners.', 'Nmap, Masscan'),
('Server', 'Default & Weak Credentials', 'Audit SSH, FTP, RDP, SMB, and database services for default, factory, or dictionary credentials.', 'Hydra, Medusa'),
('Server', 'Privilege Escalation & Misconfigurations', 'Inspect local misconfigurations, unquoted service paths, and kernel patch levels for local privilege escalation.', 'LinPEAS, WinPEAS'),
('Server', 'Outdated Software & CVE Detection', 'Correlate exposed daemon service versions against known published CVEs and public exploits.', 'Nessus, Searchsploit, Nmap NSE'),
('Server', 'Insecure Firewall & Exposure Rules', 'Verify whether sensitive infrastructure ports are properly shielded and restricted to authorized jump hosts.', 'Nmap, Netcat'),
('Server', 'SMB Signing Disabled', 'Verify if SMB signing is required on target hosts to prevent NTLM relay attacks.', 'CrackMapExec, Nmap'),
('Server', 'SSL/TLS Weak Ciphers', 'Check for deprecated protocols (SSLv3, TLS 1.0, 1.1) and insecure CBC/RC4 cipher suites.', 'testssl.sh, SSLyze');
```

---

## 💻 Deployment via XAMPP

```bash
# 1. Clone repository directly into your local web root
cd C:/xampp/htdocs/
git clone https://github.com/your-username/vapt-tracker.git

# 2. Boot Apache & MySQL via XAMPP Control Panel
# 3. Create 'vapt_tracker_db' and execute the SQL payload above
# 4. Point your browser to http://localhost/vapt-tracker
```

### Database Connection Parameters (`config/db.php`):
```php
<?php
$host = "127.0.0.1";
$db   = "vapt_tracker_db";
$user = "your_username";
$pass = "your_password";
$charset = "utf8mb4";
```

---

## 🤖 Development & Credits

| Responsibility | Contributor |
|---|---|
| **System Architecture & Code Generation** | **Google Gemini** (Full Stack Generation: HTML5, CSS3, JavaScript, PHP, Apache configuration & MySQL schemas) |
| **Project Management & System Administration** | **Repository Owner** (Project concept, database configuration, asset structure, and testing validation) |

---

## ⚖️ Legal & Security Disclaimer

> **NOTICE:** This application is intended solely for authorized vulnerability assessments, penetration testing engagements, and educational research. Performing security scans or exploiting targets without explicit, prior written authorization from the system owner is strictly prohibited and illegal under computer fraud and cybercrime legislation.
