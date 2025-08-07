// Initialize Database Tables - Complete Version with Foreign Key Fix
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
        level INT DEFAULT 1,
        exp INT DEFAULT 0,
        current_title VARCHAR(100) DEFAULT 'Novice Player',
        avatar_url VARCHAR(255) DEFAULT '/images/default-avatar.png',
        reputation INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE vulnerabilities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        exp_reward INT DEFAULT 100,
        reporter_id INT,
        resolver_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (resolver_id) REFERENCES users(id) ON DELETE SET NULL
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
        UNIQUE KEY unique_user_vulnerability (user_id, vulnerability_id)
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE user_quests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        quest_id INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        damage_dealt INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_quest (user_id, quest_id)
      );

      CREATE TABLE achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        icon_url VARCHAR(255),
        exp_reward INT DEFAULT 50,
        requirement_type ENUM('quests', 'vulnerabilities', 'level', 'special') NOT NULL,
        requirement_value INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE user_achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        achievement_id INT NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_achievement (user_id, achievement_id)
      );

      CREATE TABLE activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        vulnerability_id INT NOT NULL,
        status INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_vulnerability_report (user_id, vulnerability_id)
      );

      INSERT INTO users (username, email, password, level, exp, current_title, reputation) VALUES
        ('Kirito', 'kirito@sao.com', '${hash}', 10, 5000, 'Black Swordsman', 1000),
        ('Asuna', 'asuna@sao.com', '${hash}', 9, 4500, 'Lightning Flash', 900),
        ('Klein', 'klein@sao.com', '${hash}', 5, 2000, 'Samurai Lord', 400);

      INSERT INTO vulnerabilities (title, description, severity, status, exp_reward, reporter_id) VALUES
        ('SQL Injection in Login Form', 'The login form is vulnerable to SQL injection attacks through the username field', 'critical', 'open', 500, 1),
        ('XSS in Comments Section', 'Stored XSS vulnerability in the user comments section', 'high', 'in_progress', 300, 2),
        ('Weak Password Policy', 'System allows passwords with less than 6 characters', 'medium', 'resolved', 200, 3),
        ('Missing Rate Limiting', 'API endpoints lack rate limiting, allowing potential DoS attacks', 'high', 'open', 350, 1),
        ('Insecure Direct Object Reference', 'User profiles can be accessed by changing the ID parameter', 'medium', 'open', 250, 2);

      INSERT INTO quests (boss_name, floor_number, difficulty, exp_reward, description, health_points) VALUES
        ('Illfang the Kobold Lord', 1, 'medium', 500, 'The first floor boss of Aincrad. Defeat him to unlock the second floor!', 3000),
        ('Asterius the Taurus King', 2, 'hard', 750, 'The mighty bull that guards the second floor.', 5000),
        ('The Gleam Eyes', 74, 'nightmare', 2000, 'A demon-class boss with incredible strength.', 10000),
        ('Nicholas the Renegade', 35, 'medium', 600, 'A special event boss that appears during Christmas.', 4000),
        ('The Skull Reaper', 75, 'nightmare', 2500, 'The terrifying boss of the 75th floor.', 15000);

      INSERT INTO achievements (title, description, icon_url, exp_reward, requirement_type, requirement_value) VALUES
        ('First Blood', 'Report your first vulnerability', '/images/achievements/first-blood.png', 100, 'vulnerabilities', 1),
        ('Bug Hunter', 'Report 10 vulnerabilities', '/images/achievements/bug-hunter.png', 500, 'vulnerabilities', 10),
        ('Boss Slayer', 'Complete your first quest', '/images/achievements/boss-slayer.png', 200, 'quests', 1),
        ('Floor Master', 'Complete 5 quests', '/images/achievements/floor-master.png', 1000, 'quests', 5),
        ('Rising Star', 'Reach level 5', '/images/achievements/rising-star.png', 300, 'level', 5),
        ('Veteran Player', 'Reach level 10', '/images/achievements/veteran.png', 1500, 'level', 10);

      INSERT INTO reviews (user_id, vulnerability_id, rating, comment) VALUES
        (1, 1, 5, 'Great bug bounty platform! The gamification makes it really engaging.'),
        (2, 2, 4, 'Good system overall, but could use more quest variety.'),
        (3, 3, 5, 'Love the SAO theme! Makes vulnerability hunting feel like an adventure.'),
        (1, 4, 4, 'The ranking system is motivating. Would love to see more achievements.'),
        (2, 5, 5, 'Excellent platform for learning about security vulnerabilities.');

      INSERT INTO user_quests (user_id, quest_id, damage_dealt) VALUES
        (1, 1, 3000),
        (1, 2, 5000),
        (2, 1, 3000),
        (3, 1, 3000);

      INSERT INTO user_achievements (user_id, achievement_id) VALUES
        (1, 1),
        (1, 3),
        (2, 1),
        (2, 3),
        (3, 1);

      INSERT INTO activity_logs (user_id, action_type, details) VALUES
        (1, 'vulnerability_reported', 'Reported SQL Injection vulnerability'),
        (2, 'quest_completed', 'Defeated Illfang the Kobold Lord'),
        (3, 'achievement_unlocked', 'Unlocked First Blood achievement'),
        (1, 'level_up', 'Reached level 10'),
        (2, 'vulnerability_reported', 'Reported XSS vulnerability');

      INSERT INTO reports (user_id, vulnerability_id, status) VALUES
        (1, 1, 0),
        (2, 2, 1),
        (3, 3, 2),
        (1, 4, 0),
        (2, 5, 0);
    `;

    pool.query(SQLSTATEMENT, callback);
  }
});