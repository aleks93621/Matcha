<?php
require_once('../config/setup.php');
require_once('./classes/form.php');

$form = new Form($_POST, 5);

if (isset($_POST['envoyer'])) {
    if ($form->getEmpty($_POST) === $form->nbr) {
        $tab_post = $form->htmlSpecialChar();
        if ($form->checkMail($tab_post['nom']) === 1) {

        } else {
            echo 'Adresse mail invalide !'; /* @Erreur à faire   */
        }
    } else {
        echo 'Tous les champs doivent être remplis !';   /* @Erreur à faire */
    }
}
?>
<html>
<head>
  <title>PAGE D'INSCRIPTION</title>
</head>
<body>
  <form action="#" method="post">
    <?php
      echo $form->input('nom', 'Nom', 'text', '1');
      echo $form->input('prenom', 'Prenom', 'text', '1');
      echo $form->input('mail', 'Adresse mail', 'text', '0');
      echo $form->input('nom_utilisateur', 'Nom d\'utilisateur', 'text', '0');
      echo $form->input('mdp', 'Mot de passe', 'password', '0');
      echo $form->submit('S\'inscrire', 'envoyer');
    ?>
  </form>
</body>
</html>
