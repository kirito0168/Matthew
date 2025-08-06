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
      ('X\\'rphan the White Wyrm', 11, 'medium', 900, 'An ice dragon that freezes everything in its path.', 4500),
      ('The Ember Phoenix', 12, 'medium', 1000, 'A legendary firebird that resurrects from its own ashes.', 5000),
      ('Storm Caller', 13, 'medium', 1100, 'An elemental boss that controls lightning and thunder.', 5500),
      ('The Brass Juggernaut', 14, 'medium', 1200, 'A mechanical titan made of enchanted brass.', 6000),
      ('Yamata-no-Orochi', 15, 'medium', 1300, 'The legendary eight-headed and eight-tailed dragon.', 6500),
      
      -- Hard Bosses (Floor 20-50)
      ('The Four Arms', 20, 'hard', 1500, 'A four-armed demon warrior wielding multiple weapons.', 7500),
      ('Baran the General Taurus', 25, 'hard', 1800, 'The supreme commander of all minotaur forces.', 8500),
      ('The Geocrawler', 27, 'hard', 2000, 'A massive earth elemental that tunnels through solid rock.', 9000),
      ('The Shadow Monarch', 35, 'hard', 2200, 'A king of darkness that commands an army of shadows.', 10000),
      ('Laughing Coffin Leader', 40, 'hard', 2400, 'The mysterious leader of the player-killer guild.', 11000),
      ('The Gleam Eyes', 50, 'hard', 3000, 'A demonic beast with glowing blue eyes and incredible strength.', 12000),
      
      -- Nightmare Bosses (Floor 75-100)
      ('The Skull Reaper Elite', 75, 'nightmare', 5000, 'An evolved form of the Skull Reaper with enhanced abilities.', 20000),
      ('An Incarnation of the Radius', 100, 'nightmare', 10000, 'The final boss of Aincrad, wielding the power of the entire castle.', 30000);

      INSERT INTO achievements (name, description, icon_url, exp_reward, requirement_type, requirement_value) VALUES
      ('Bug Hunter', 'Report your first vulnerability', '/images/bug-hunter.png', 50, 'vulnerabilities_reported', 1),
      ('Bug Slayer', 'Report 10 vulnerabilities', '/images/bug-slayer.png', 200, 'vulnerabilities_reported', 10),
      ('Bug Exterminator', 'Report 25 vulnerabilities', '/images/bug-exterminator.png', 500, 'vulnerabilities_reported', 25),
      ('Bug Legend', 'Report 50 vulnerabilities', '/images/bug-legend.png', 1000, 'vulnerabilities_reported', 50),
      ('Problem Solver', 'Resolve your first vulnerability', '/images/problem-solver.png', 100, 'vulnerabilities_resolved', 1),
      ('Elite Solver', 'Resolve 10 vulnerabilities', '/images/elite-solver.png', 500, 'vulnerabilities_resolved', 10),
      ('Master Resolver', 'Resolve 25 vulnerabilities', '/images/master-resolver.png', 1000, 'vulnerabilities_resolved', 25),
      ('First Blood', 'Complete your first quest', '/images/first-blood.png', 100, 'quests_completed', 1),
      ('Boss Slayer', 'Complete 5 quests', '/images/boss-slayer.png', 300, 'quests_completed', 5),
      ('Floor Clearer', 'Complete 10 quests', '/images/floor-clearer.png', 500, 'quests_completed', 10),
      ('Boss Hunter', 'Complete 20 quests', '/images/boss-hunter.png', 1000, 'quests_completed', 20),
      ('Raid Master', 'Complete 50 quests', '/images/raid-master.png', 2500, 'quests_completed', 50),
      ('Level 10 Player', 'Reach level 10', '/images/level-10.png', 200, 'level_reached', 10),
      ('Level 25 Elite', 'Reach level 25', '/images/level-25.png', 500, 'level_reached', 25),
      ('Level 50 Master', 'Reach level 50', '/images/level-50.png', 1000, 'level_reached', 50),
      ('Level 75 Legend', 'Reach level 75', '/images/level-75.png', 2000, 'level_reached', 75),
      ('Level 100 Hero', 'Reach level 100', '/images/level-100.png', 5000, 'level_reached', 100),
      ('Reviewer', 'Give 5 reviews', '/images/reviewer.png', 100, 'reviews_given', 5),
      ('Critic', 'Give 10 reviews', '/images/critic.png', 250, 'reviews_given', 10),
      ('Expert Reviewer', 'Give 25 reviews', '/images/expert-reviewer.png', 500, 'reviews_given', 25);

      INSERT INTO vulnerabilities (title, description, severity, exp_reward, reporter_id, status) VALUES
      ('XSS in Login Form', 'Cross-site scripting vulnerability found in the login form input field. Allows injection of malicious scripts.', 'high', 200, 2, 'open'),
      ('SQL Injection in Search', 'SQL injection vulnerability in the search functionality allows database manipulation.', 'critical', 500, 3, 'resolved'),
      ('Weak Password Policy', 'System allows passwords with less than 6 characters, making accounts vulnerable to brute force.', 'medium', 100, 2, 'open'),
      ('CSRF Token Missing', 'Cross-Site Request Forgery protection is missing on critical forms.', 'high', 250, 3, 'in_progress'),
      ('Directory Traversal', 'File system access vulnerability allows reading of sensitive files.', 'critical', 400, 2, 'open'),
      ('Insecure Direct Object Reference', 'Users can access other users data by changing URL parameters.', 'high', 300, 3, 'resolved'),
      ('Missing Rate Limiting', 'API endpoints lack rate limiting, vulnerable to DoS attacks.', 'medium', 150, 2, 'open'),
      ('Unencrypted Data Storage', 'Sensitive user data stored in plaintext in database.', 'critical', 450, 3, 'resolved'),
      ('Broken Authentication', 'Session tokens dont expire, allowing indefinite access.', 'high', 350, 2, 'in_progress'),
      ('Information Disclosure', 'Error messages reveal sensitive system information.', 'low', 75, 3, 'closed');

      INSERT INTO reviews (user_id, vulnerability_id, rating, comment) VALUES
      (2, NULL, 5, 'Excellent bug bounty platform! The gamification makes it really engaging and fun to find vulnerabilities.'),
      (3, NULL, 4, 'Great system, but could use more quest variety. Love the SAO theme!'),
      (2, 2, 5, 'Critical vulnerability fixed quickly. Great response from the team!'),
      (3, 6, 4, 'Interesting vulnerability. The fix was implemented efficiently.'),
      (2, NULL, 5, 'The level system keeps me motivated to find more bugs. Awesome concept!'),
      (3, NULL, 3, 'Good platform but needs better documentation for beginners.'),
      (2, 8, 5, 'Important security issue resolved. Database is now much more secure.'),
      (3, NULL, 4, 'The achievement system is addictive! Keep up the good work.');

      INSERT INTO activity_logs (user_id, action_type, details) VALUES
      (1, 'level_up', '{"level": 1, "message": "Welcome to SAO Bug Bounty System!"}'),
      (2, 'level_up', '{"level": 1, "message": "Welcome to SAO Bug Bounty System!"}'),
      (3, 'level_up', '{"level": 1, "message": "Welcome to SAO Bug Bounty System!"}'),
      (2, 'vulnerability_reported', '{"vulnerability_id": 1, "title": "XSS in Login Form", "exp_gained": 200}'),
      (3, 'vulnerability_reported', '{"vulnerability_id": 2, "title": "SQL Injection in Search", "exp_gained": 500}'),
      (2, 'vulnerability_reported', '{"vulnerability_id": 3, "title": "Weak Password Policy", "exp_gained": 100}'),
      (3, 'vulnerability_resolved', '{"vulnerability_id": 2, "exp_gained": 250}'),
      (2, 'achievement_unlocked', '{"achievement": "Bug Hunter", "exp_gained": 50}'),
      (3, 'achievement_unlocked', '{"achievement": "Bug Hunter", "exp_gained": 50}'),
      (3, 'achievement_unlocked', '{"achievement": "Problem Solver", "exp_gained": 100}'),
      (2, 'review_posted', '{"review_id": 1, "rating": 5}'),
      (3, 'review_posted', '{"review_id": 2, "rating": 4}');

      UPDATE users SET level = 3, exp = 350 WHERE username = 'Kirito';
      UPDATE users SET level = 4, exp = 650, current_title = 'Bug Resolver' WHERE username = 'Asuna';
      UPDATE vulnerabilities SET resolver_id = 3 WHERE id IN (2, 6, 8);
    `;

    pool.query(SQLSTATEMENT, callback);
  }
});