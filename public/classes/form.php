<?php
/**
  * Class Form
  * Permet de générer un formulaire simple
  */
  class Form {

    /**
      * @var int Nombre d'inputs, initliasé par le constructeur
      */
    public $nbr = 0;

    /**
      * @var array Données utilisateurs , $_POST , etc ...
      */
    private $data;

    /**
      * @var string Tag utilisé pour entourer les champs.
      */
    public $surround = 'p';



    
    /**
      * @param array $data Permet de remplir l'array si un argument est passé
      * sur la class lors de son appel
      * @param int $nbr_form Permet d'enregistrer le nombres d'inputs
      */
    public function __construct($data = array(), $nbr_form) {
      $this->data = $data;
      $this->nbr = $nbr_form;
    }




    /**
      * @param $html string Code html à entourer par la variable $surround
      * @return string
      */
    private function surround($html){
      return "<{$this->surround}>{$html}</{$this->surround}>";
    }





    /**
      * @param $index ou $nom de l'input string. Ce param sert à parcourir le tab $data
      * selon l'index/le nom de l'input.
      * @return string
      */
    private function getValue($index){
      return isset($this->data[$index]) ? $this->data[$index] : null;
    }




    /**
      * @param $data string Fonction qui compte le nombre de champs remplis
      * @return int Nombre de champs remplis
      */
    public function getEmpty($data) {
      return count(array_filter($data));
    }




    /**
      * @return array , retourne les $_POST passé sous htmlspecialchars pour la
      * sécurité
      */
    public function htmlSpecialChar() {
      foreach ($this->data as $e => $val) {
        $d[$e] = htmlspecialchars($val);
      }
      return $d;
    }




    /**
      * @param $name string, $place_holder string , $type string , $value = string
      * Fonction qui sert à générer l'input.
      * @return string
      */
    public function input($name, $place_holder = null, $type = null, $value) {
      if ($value === '1') {
        return $this->surround
        ('<input type="'.$type.'" name="'. $name .'" placeholder="'. $place_holder
         .'" value="'.$this->getValue($name).'">');
     }
     else {
       return $this->surround
       ('<input type="'.$type.'" name="'. $name .'" placeholder="'. $place_holder.'">');
     }
    }



    /**
      * @param string $nom Valeur du submit
      * @param string $name Name du submit pour intercepter le $_POST du submit
      * @return string
      */
    public function submit($nom, $name){
      return $this->surround('<button name="'.$name.'" type="submit">'.$nom.'</button>');
    }
  }
?>
