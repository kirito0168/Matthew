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
  } else {
    console.log("Hashed password:", hash);

    const SQLSTATEMENT = `
      DROP TABLE IF EXISTS activity_logs;
      DROP TABLE IF EXISTS user_achievements;
      DROP TABLE IF EXISTS achievements;
      DROP TABLE IF EXISTS user_quests;
      DROP TABLE IF EXISTS quests;
      DROP TABLE IF EXISTS reviews;
      DROP TABLE IF EXISTS vulnerabilities;
      DROP TABLE IF EXISTS users;

      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        level INT DEFAULT 1,
        exp INT DEFAULT 0,
        current_title VARCHAR(100) DEFAULT 'Novice Player',
        avatar_url VARCHAR(255) DEFAULT '/images/default-avatar.png',
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
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon_url VARCHAR(255),
        exp_reward INT DEFAULT 50,
        requirement_type ENUM('vulnerabilities_reported', 'vulnerabilities_resolved', 'quests_completed', 'level_reached', 'reviews_given') NOT NULL,
        requirement_value INT NOT NULL,
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
        action_type ENUM('vulnerability_reported', 'vulnerability_resolved', 'quest_completed', 'achievement_unlocked', 'review_posted', 'level_up') NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      INSERT INTO users (username, email, password) VALUES
      ('admin', 'admin@sao.com', '${hash}'),
      ('Kirito', 'kirito@sao.com', '${hash}'),
      ('Asuna', 'asuna@sao.com', '${hash}');

      INSERT INTO quests (boss_name, floor_number, difficulty, exp_reward, description, health_points) VALUES
      -- Easy Bosses (Floor 1-5)
      ('Illfang the Kobold Lord', 1, 'easy', 100, 'The first floor boss of Aincrad. A massive kobold wielding a bone axe and talwar.', 500),
      ('Asterius the Taurus King', 2, 'easy', 150, 'A mighty minotaur that guards the second floor with his massive war hammer.', 750),
      ('Nerius the Evil Treant', 3, 'easy', 200, 'An ancient tree corrupted by dark magic, with writhing roots and branches.', 1000),
      ('Wythege the Hippocampus', 4, 'easy', 250, 'A water beast with the front of a horse and the tail of a fish.', 1250),
      ('Fuscus the Vacant Colossus', 5, 'easy', 300, 'A hollow giant made of ancient stone, powered by mysterious magic.', 1500),
      
      -- Medium Bosses (Floor 6-15)
      ('The Irrational Cube', 6, 'medium', 400, 'A geometric nightmare that defies the laws of physics.', 2000),
      ('Nato the Colonel Taurus', 7, 'medium', 500, 'An elite minotaur warrior clad in ceremonial armor.', 2500),
      ('The Limitless Hydra', 8, 'medium', 600, 'A multi-headed serpent that regenerates when damaged.', 3000),
      ('Kagachi the Samurai Lord', 9, 'medium', 700, 'A master swordsman spirit wielding legendary katanas.', 3500),
      ('The Fatal Scythe', 10, 'medium', 800, 'A grim reaper that harvests the souls of failed warriors.', 4000),
      ('The Twisted Watcher', 12, 'medium', 900, 'A giant eye that sees all and warps reality around it.', 4500),
      ('Dominus the Corrupt Noble', 15, 'medium', 1000, 'A fallen aristocrat who commands dark knights.', 5000),
      
      -- Hard Bosses (Floor 20-50)
      ('Nicholas the Renegade', 20, 'hard', 1200, 'A fallen Christmas event boss that turned hostile year-round.', 6000),
      ('The Skull Reaper', 25, 'hard', 1500, 'A skeletal centipede with scythe-like arms that cleaves through parties.', 8000),
      ('Baran the General Taurus', 30, 'hard', 1800, 'The supreme commander of all taurus warriors.', 9000),
      ('The Adamantine Golem', 35, 'hard', 2100, 'An indestructible golem forged from the hardest metal in Aincrad.', 10000),
      ('Laughing Coffin Leader', 40, 'hard', 2400, 'The mysterious leader of the player-killer guild.', 11000),
      ('The Gleam Eyes', 50, 'hard', 3000, 'A demonic beast with glowing blue eyes and incredible strength.', 12000),
      
      -- Nightmare Bosses (Floor 75-100)
      ('The Skull Reaper Elite', 75, 'nightmare', 5000, 'An evolved form of the Skull Reaper with enhanced abilities.', 20000),
      ('An Incarnation of the Radius', 100, 'nightmare', 10000, 'The final boss of Aincrad, wielding the power of the entire castle.', 30000);

      INSERT INTO achievements (name, description, icon_url, exp_reward, requirement_type, requirement_value) VALUES
      ('Bug Hunter', 'Report your first vulnerability', '/images/bug-hunter.png', 50, 'vulnerabilities_reported', 1),
      ('Bug Slayer', 'Report 10 vulnerabilities', '/images/bug-slayer.png', 200, 'vulnerabilities_reported', 10),
      ('Problem Solver', 'Resolve your first vulnerability', '/images/problem-solver.png', 100, 'vulnerabilities_resolved', 1),
      ('Elite Solver', 'Resolve 10 vulnerabilities', '/images/elite-solver.png', 500, 'vulnerabilities_resolved', 10),
      ('First Blood', 'Complete your first quest', '/images/first-blood.png', 100, 'quests_completed', 1),
      ('Boss Slayer', 'Complete 5 quests', '/images/boss-slayer.png', 300, 'quests_completed', 5),
      ('Floor Clearer', 'Complete 10 quests', '/images/floor-clearer.png', 500, 'quests_completed', 10),
      ('Boss Hunter', 'Complete 20 quests', '/images/boss-hunter.png', 1000, 'quests_completed', 20),
      ('Level 10 Player', 'Reach level 10', '/images/level-10.png', 200, 'level_reached', 10),
      ('Level 25 Elite', 'Reach level 25', '/images/level-25.png', 500, 'level_reached', 25),
      ('Level 50 Master', 'Reach level 50', '/images/level-50.png', 1000, 'level_reached', 50),
      ('Reviewer', 'Give 5 reviews', '/images/reviewer.png', 100, 'reviews_given', 5);

      INSERT INTO vulnerabilities (title, description, severity, exp_reward, reporter_id) VALUES
      ('XSS in Login Form', 'Cross-site scripting vulnerability found in the login form input field', 'high', 200, 2),
      ('SQL Injection in Search', 'SQL injection vulnerability in the search functionality', 'critical', 500, 3),
      ('Weak Password Policy', 'System allows passwords with less than 6 characters', 'medium', 100, 2);

      INSERT INTO reviews (user_id, rating, comment) VALUES
      (2, 5, 'Excellent bug bounty platform! The gamification makes it really engaging.'),
      (3, 4, 'Great system, but could use more quest variety.');

      INSERT INTO activity_logs (user_id, action_type, details) VALUES
      (1, 'level_up', '{"level": 1, "message": "Welcome to SAO!"}'),
      (2, 'level_up', '{"level": 1, "message": "Welcome to SAO!"}'),
      (3, 'level_up', '{"level": 1, "message": "Welcome to SAO!"}');

      CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vulnerability_id INT NOT NULL,
    status INT DEFAULT 0 COMMENT '0: Open, 1: In Progress, 2: Resolved, 3: Closed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vulnerability_id) REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_vulnerability_report (user_id, vulnerability_id)
);
      `;

    pool.query(SQLSTATEMENT, callback);
  }
});