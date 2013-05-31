<?php 

class imggen extends CI_Controller {
  public function __construct()
  {
    parent::__construct();
    $this->load->model('post_model');
    $this->load->model('user_model');
    $this->load->helper('url');
    $this->load->model('imggen_model');
  }
  public function newimg($post_id = -1)
  {
    $data = array();
    $fname = $this->config->item('fname');
    $fcapt = $this->config->item('fcapt');
    $bgnumber = $this->config->item('bgnumber');
    $data['bgarray'] = array();
    for ($i=1; $i < $bgnumber+1; $i++) { 
      $data['bgarray'][$i] = "Background ".$i;
    }
    $data['fontlist'] = array_combine($fname,$fcapt);
    $data['defaultf'] = $this->config->item('defaultf');

  	$this->load->helper('form');
    $this->load->library('form_validation');
    $this->form_validation->set_rules('lyric', 'Lyric', 'required');
    $this->form_validation->set_rules('meta', 'Song Meta', 'required');
    
    if(!($post_id == -1)){
      $post = $post = $this->post_model->get_by_id($post_id);
      $data['lyric'] = $post->lyric;
      $data['meta']  = $post->name." by ".$post->artist;
      $data['meta'] .= (strlen($post->featuring)) ? " feat. ".$post->featuring : "";
      $data['meta'] .= (strlen($post->album)) ? " in ".$post->album : "";
    }
    
    if($this->form_validation->run() === FALSE){
      $this->load->view('imggen/new',$data);
    }else{
      $img_id = $this->imggen_model->add_img();
      redirect('/imggen/edit/'.$img_id.'?post=1');
    }
  }
  public function editimg($img_id)
  {
    $fname = $this->config->item('fname');
    $fcapt = $this->config->item('fcapt');
    $bgnumber = $this->config->item('bgnumber');
    $data['fontlist'] = array_combine($fname,$fcapt);
    $data['bgarray'] = array();
    for ($i=1; $i < $bgnumber+1; $i++) { 
      $data['bgarray'][$i] = "Background ".$i;
    }

    $this->load->helper('form');
    $this->load->library('form_validation');
    $this->form_validation->set_rules('lyric', 'Lyric', 'required');
    $this->form_validation->set_rules('meta', 'Song Meta', 'required');
    $data['post']=$this->imggen_model->get_by_id($img_id);
    $clicked_post = $this->input->post('submit'); // "post" nutton clicked?
    $form_valid=$this->form_validation->run(); // Form validation
    $data['success'] = FALSE;
    if($data['post']===FALSE){$this->load->view('gy/404');}
    elseif(($form_valid === FALSE) || ($clicked_post===FALSE)){
      $this->load->view('imggen/edit',$data);
    }else{
      $this->imggen_model->edit_img($img_id);
      $data['post']=$this->imggen_model->get_by_id($img_id);
      $data['success'] = TRUE;
      $this->load->view('imggen/edit',$data);
    }

  }
  public function output($img_id=0)
  {
  	header ("Content-type: image/png");
    //var_dump(!($this->imggen_model->get_by_id($img_id) === false));

    if(($this->imggen_model->get_by_id($img_id) === FALSE)){
      $this->imggen_model->imggen();
    }else{
      //echo "HEREIAM!!!";
      $this->imggen_model->imggen_db($img_id);
    }
  	
  }
  public function help()
  {
    $data['bgno'] = $this->config->item('bgnumber');
    $fcapt = $this->config->item('fcapt');
    $fpath = $this->config->item('fpath');
    foreach ($fpath as &$string) {
      $string = substr($string, 8, -4);
    }
    $data['flist'] = array_combine($fpath, $fcapt);
    $this->load->view('imggen/help',$data);
  }
}
?>