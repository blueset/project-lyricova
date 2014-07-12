<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class admin_model extends CI_Model {

  public function __construct(){
    parent::__construct();
    $this->load->database();
  }
  //
  // General Config
  //
  public function get_config($name)
  {
  	if ($name == NULL){return false;}
  	else{
  		$query = $this->db->get_where('config',array('name'=>$name));
  		if ($query->num_rows()>0){return $query->row()->value;}
  		else{return false;}
  	}
  }
  public function set_config($name,$value)
  {
  	if ($name == NULL){return false;}
  	else{
  		return $this->db->update('config',array('value'=>$value),array('name'=>$name));
  	}
  }
  public function set_configs($names=array())
  {
  	foreach ($names as $name) {
  		$this -> set_config($name, $this->input->post($name));
  	}
  }
  public function get_title()
  {
  	return htmlspecialchars($this->admin_model->get_config('title'));
  
}  //
  // Font management
  //
  public function load_font()
  {
    return $this->db->get('fonts')->result();
  }
  public function check_font($name)
  {
    return file_exists("./fonts/".$name.".ttf");
  }
}