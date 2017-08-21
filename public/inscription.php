<?php
require_once('../config/setup.php');
require_once('./classes/form.php');

$form = new Form($_POST, 5);
if ($form->getEmpty($_POST) === $form->nbr) {
  $tab_post = $form->htmlSpecialChar();
   
}
else {
  echo 'Tous les champs doivent être remplis !';
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
      echo $form->submit('S\'inscrire');
    ?>
  </form>
</body>
</html>
