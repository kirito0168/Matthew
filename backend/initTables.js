// Initialize Database Tables - Complete Version with Updated Vulnerabilities Table
const pool = require("./services/db");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const callback = (error, results, fields) => {
  if (error) {
    console.error("Error creating tables:", error);
  } else {
    console.log("Tables created successfully");
  }
  process.exit();
}

bcrypt.hash('1234', saltRounds, (error, hash) => {
  if (error) {
    console.error("Error hashing password:", error);
    process.exit(1);
  } else {
    console.log("Hashed password:", hash);

    const SQLSTATEMENT = `
      SET FOREIGN_KEY_CHECKS = 0;
      
      DROP TABLE IF EXISTS reports;
      DROP TABLE IF EXISTS activity_logs;
      DROP TABLE IF EXISTS user_achievements;
      DROP TABLE IF EXISTS achievements;
      DROP TABLE IF EXISTS user_quests;
      DROP TABLE IF EXISTS quests;
      DROP TABLE IF EXISTS reviews;
      DROP TABLE IF EXISTS vulnerabilities;
      DROP TABLE IF EXISTS users;
      
      SET FOREIGN_KEY_CHECKS = 1;

      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'moderator', 'admin') DEFAULT 'user',
        level INT DEFAULT 1,
        exp INT DEFAULT 0,
        current_title VARCHAR(100) DEFAULT 'Novice Player',
        avatar_url VARCHAR(255) DEFAULT '/images/default-avatar.png',
        reputation INT DEFAULT 0,
        vulnerabilities_reported INT DEFAULT 0,
        vulnerabilities_resolved INT DEFAULT 0,
        total_exp_earned INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_level (level),
        INDEX idx_exp (exp)
      );

      CREATE TABLE vulnerabilities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
        category ENUM('xss', 'sqli', 'auth', 'idor', 'csrf', 'rce', 'other') NOT NULL,
        steps_to_reproduce TEXT NOT NULL,
        impact TEXT NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        exp_reward INT DEFAULT 100,
        reporter_id INT,
        resolver_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (resolver_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_severity (severity),
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_reporter (reporter_id),
        INDEX idx_resolver (resolver_id),
        INDEX idx_created (created_at)
      );

      CREATE TABLE reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        vulnerability_id INT,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_vulnerability (user_id, vulnerability_id),
        INDEX idx_rating (rating),
        INDEX idx_created (created_at)
      );

      CREATE TABLE quests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boss_name VARCHAR(100) NOT NULL,
        floor_number INT NOT NULL,
        difficulty ENUM('easy', 'medium', 'hard', 'nightmare') NOT NULL,
        exp_reward INT NOT NULL,
        description TEXT,
        health_points INT DEFAULT 1000,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_difficulty (difficulty),
        INDEX idx_floor (floor_number),
        INDEX idx_active (is_active)
      );

      CREATE TABLE user_quests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        quest_id INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        damage_dealt INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_quest (user_id, quest_id),
        INDEX idx_completed (completed_at)
      );

      CREATE TABLE achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        icon_url VARCHAR(255),
        exp_reward INT DEFAULT 50,
        requirement_type ENUM('quests', 'vulnerabilities', 'level', 'special') NOT NULL,
        requirement_value INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (requirement_type)
      );

      CREATE TABLE user_achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        achievement_id INT NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_achievement (user_id, achievement_id),
        INDEX idx_unlocked (unlocked_at)
      );

      CREATE TABLE activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        details TEXT,
        exp_gained INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_action (action_type),
        INDEX idx_created (created_at)
      );

      CREATE TABLE reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        vulnerability_id INT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        points INT DEFAULT 0,
        findings JSON,
        description TEXT,
        proof_of_concept TEXT,
        impact TEXT,
        mitigation TEXT,
        admin_notes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_submitted (submitted_at),
        INDEX idx_user_vuln (user_id, vulnerability_id)
      );

      -- Insert default admin user
      INSERT INTO users (username, email, password, role, level, exp, current_title) VALUES
        ('admin', 'admin@saobugbounty.com', '${hash}', 'admin', 10, 5000, 'System Administrator'),
        ('kirito', 'kirito@saobugbounty.com', '${hash}', 'user', 5, 2500, 'Black Swordsman'),
        ('asuna', 'asuna@saobugbounty.com', '${hash}', 'moderator', 7, 3500, 'Lightning Flash');

      -- Insert sample vulnerabilities with all required fields
      INSERT INTO vulnerabilities (title, description, severity, category, steps_to_reproduce, impact, exp_reward, reporter_id, status) VALUES
        ('SQL Injection in Login Form', 'The login form is vulnerable to SQL injection attacks through the username parameter.', 'critical', 'sqli', '1. Navigate to /login\\n2. Enter username: admin'' OR 1=1--\\n3. Enter any password\\n4. Click login\\n5. Successfully bypass authentication', 'Attackers can bypass authentication and gain unauthorized access to user accounts and sensitive data.', 500, 2, 'open'),
        ('Cross-Site Scripting in Comments', 'User comments are not properly sanitized, allowing XSS attacks.', 'high', 'xss', '1. Go to any post with comments\\n2. Enter comment: <script>alert(\"XSS\")</script>\\n3. Submit comment\\n4. Page displays alert when comment loads', 'Attackers can execute malicious scripts in victims'' browsers, steal session cookies, or perform actions on behalf of users.', 300, 3, 'in_progress'),
        ('Weak Password Policy', 'The system accepts very weak passwords like \"123\" or \"password\".', 'medium', 'auth', '1. Go to registration page\\n2. Enter username: testuser\\n3. Enter password: 123\\n4. Successfully create account with weak password', 'Users with weak passwords are vulnerable to brute force attacks and credential stuffing.', 200, 2, 'resolved'),
        ('IDOR in User Profile Access', 'Users can access other users'' profiles by manipulating the user ID parameter.', 'high', 'idor', '1. Log in as any user\\n2. Navigate to /profile?id=1\\n3. Change id parameter to different values\\n4. Access other users'' private profiles', 'Unauthorized access to private user information and potential data breach.', 350, 3, 'open'),
        ('CSRF in Account Settings', 'Account settings can be changed without proper CSRF protection.', 'medium', 'csrf', '1. Create malicious form on external site\\n2. Target user visits malicious site while logged in\\n3. Form automatically submits to change user settings\\n4. User account modified without consent', 'Attackers can modify user account settings without user knowledge or consent.', 250, 2, 'open');

      -- Insert sample quests
      INSERT INTO quests (boss_name, floor_number, difficulty, exp_reward, description, health_points) VALUES
        ('Illfang the Kobold Lord', 1, 'easy', 500, 'Defeat the first floor boss of Aincrad', 2000),
        ('The Gleam Eyes', 74, 'hard', 2000, 'A powerful demon boss with incredible speed', 15000),
        ('Skull Reaper', 75, 'nightmare', 5000, 'The most feared boss in all of Aincrad', 25000),
        ('Fatal Scythe', 50, 'medium', 1000, 'A mid-level boss with deadly attacks', 8000);

      -- Insert sample reviews
      INSERT INTO reviews (user_id, vulnerability_id, rating, comment) VALUES
        (1, 1, 5, 'Excellent find! Critical security issue.'),
        (2, 2, 4, 'Good catch on the XSS vulnerability.'),
        (3, 3, 3, 'Password policy definitely needs improvement.');

      -- Insert sample achievements
      INSERT INTO achievements (title, description, icon_url, exp_reward, requirement_type, requirement_value) VALUES
        ('First Blood', 'Report your first vulnerability', '/images/achievements/first-blood.png', 100, 'vulnerabilities', 1),
        ('Bug Hunter', 'Report 10 vulnerabilities', '/images/achievements/bug-hunter.png', 500, 'vulnerabilities', 10),
        ('Security Expert', 'Report 50 vulnerabilities', '/images/achievements/security-expert.png', 2000, 'vulnerabilities', 50),
        ('Level Up!', 'Reach level 5', '/images/achievements/level-up.png', 200, 'level', 5),
        ('Quest Master', 'Complete 10 quests', '/images/achievements/quest-master.png', 1000, 'quests', 10),
        ('Elite Hacker', 'Reach level 10', '/images/achievements/elite-hacker.png', 1000, 'level', 10);

      -- Insert sample user achievements
      INSERT INTO user_achievements (user_id, achievement_id) VALUES
        (2, 1), -- Kirito got First Blood
        (3, 1), -- Asuna got First Blood
        (2, 4); -- Kirito reached level 5

      -- Insert sample activity logs
      INSERT INTO activity_logs (user_id, action_type, details, exp_gained) VALUES
        (2, 'vulnerability_reported', 'Reported SQL Injection vulnerability', 500),
        (3, 'vulnerability_reported', 'Reported XSS vulnerability', 300),
        (2, 'achievement_unlocked', 'Unlocked First Blood achievement', 100),
        (3, 'quest_completed', 'Completed Illfang the Kobold Lord quest', 500),
        (2, 'level_up', 'Reached level 5', 0);

      -- Insert sample reports
      INSERT INTO reports (user_id, vulnerability_id, status, points, description, proof_of_concept, impact, mitigation) VALUES
        (2, 1, 'approved', 500, 'Found SQL injection in login form that allows authentication bypass', 'Username: admin'' OR 1=1-- bypasses authentication', 'Complete unauthorized access to user accounts', 'Implement parameterized queries and input validation'),
        (3, 2, 'approved', 300, 'XSS vulnerability in comment system', '<script>alert(\"XSS\")</script> executes in user browsers', 'Session hijacking and malicious script execution', 'Sanitize and escape all user input before display'),
        (2, 3, 'approved', 200, 'Weak password policy allows trivial passwords', 'Password \"123\" was accepted during registration', 'Easy brute force attacks on user accounts', 'Enforce minimum password complexity requirements');
    `;

    pool.query(SQLSTATEMENT, callback);
  }
});