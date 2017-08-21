<?php
  try {
    require_once('database.php');

    $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASSWORD);

    $requete= "CREATE DATABASE IF NOT EXISTS matcha";
    $pdo->exec($requete);

    $requete = "USE matcha";
    $pdo->exec($requete);

    $requete = "CREATE TABLE IF NOT EXISTS membres(
                  id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
                  mail VARCHAR(255) NOT NULL,
                  nom_utilisateur VARCHAR(50) NOT NULL,
                  nom VARCHAR(255) NOT NULL,
                  prenom VARCHAR(255) NOT NULL,
                  mdp VARCHAR(1000) NOT NULL)";
     $pdo->exec($requete);

  }
  catch (PDOException $e) {
      echo $sql . "<br>" . $e->getMessage();
  }
?>
