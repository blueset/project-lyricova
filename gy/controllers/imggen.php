<?php 

class imggen extends CI_Controller {
  public function __construct()
  {
    parent::__construct();
    $this->load->model('post_model');
    $this->load->model('user_model');
    $this->load->model('admin_model');
    $this->load->helper('url');
    $this->load->model('imggen_model');
  }
  public function newimg($post_id = -1)
  {
    if($this->user_model->logged_in() !== TRUE){redirect('login?target='.uri_string());}
    $data = array();
    $bgnumber = $this->config->item('bgnumber');
    $data['bgarray'] = array();
    for ($i=1; $i < $bgnumber+1; $i++) { 
      $data['bgarray'][$i] = "Background ".$i;
    }
    $data['fontlist'] = $this->admin_model->load_font();

  	$this->load->helper('form');
    $this->load->library('form_validation');
    $this->form_validation->set_rules('lyric', 'Lyric', 'required');
    $this->form_validation->set_rules('meta', 'Song Meta', 'required');
    
    if(!($post_id == -1)){
      $post = $this->post_model->get_by_id($post_id);
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
    if($this->user_model->logged_in() !== TRUE){redirect('login?target='.uri_string());}
    
    $bgnumber = $this->config->item('bgnumber');
    $data['fontlist'] = $this->admin_model->load_font();
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
    if(($this->imggen_model->get_by_id($img_id) === FALSE)){
      $this->imggen_model->imggen();
    }else{
      $this->imggen_model->imggen_db($img_id);
    }
  }
  public function dynamic($id)
  {
    // headers for reload and content-type
    header( "Content-type: image/png");
    header( 'Expires: Sat, 26 Jul 1997 05:00:00 GMT' ); 
    header( 'Last-Modified: ' . gmdate( 'D, d M Y H:i:s' ) . ' GMT' ); 
    header( 'Cache-Control: no-store, no-cache, must-revalidate' ); 
    header( 'Cache-Control: post-check=0, pre-check=0', false ); 
    header( 'Pragma: no-cache' ); 

    $user = $this->user_model->get_by_id($id);
    if ($user === false){ // if there is no user id
      $this->output();
      return;
    }
    // get get post by user
    $post = $this->post_model->last_post_by_user($id);
    if ($post === False){ // if user has no post
      $this->output();
      return;
    }
    // gather information
    $settings = json_decode($this->user_model->get_usermeta($id, 'signature', $this->admin_model->get_config('signature')),true);
    $settings['meta'] = $post->name ." by ". $post->artist;
    $settings['meta'] .= strlen($post->featuring) ? " feat. ". $post->featuring : "";
    $settings['string'] = strip_tags($post->lyric);
    $settings['id'] = $id;

    $this->imggen_model->imggen_dynm($settings);
      //   $height = 600;
      //   $width = 300;
      //   $meta_str = $post->name ." by ". $post->artist;
      //   $meta_str .= strlen($post->featuring) ? " feat. ". $post->featuring : "";
      //   $lyric = strip_tags($post->lyric);
      //   $lines = substr_count($lyric, "\n")+1;
      //   $bbox = imagettfbbox(50, 0, "./fonts/DroidSansFallback.ttf", $lyric);
      //   $dx = ($bbox[4]-$bbox[6]);
      //   $max_size = 50 * ($height-20) / $dx; // Geometry similar rectangle
      //   $lineh = ($width - 120) / $lines;
      //   $size = $lineh / 3 * 2;
      //   if($size>$max_size){
      //     $size=$max_size;
      //     $lineh = $size /2 *3;
      //   }
      //   $this->imggen_model->imggen_dynm($lyric,
      //             $size,
      //             $lineh,
      //             "./fonts/DroidSansFallback.ttf",
      //             $meta_str,
      //             10, 
      //             25, 
      //             "./img/dymn-bg/bg1.png",
      //             "w",
      //             $height,
      //             $width,
      //             10,
      //             10,
      //             "tl",
      //             base_url());
      // }
    
  }
  public function help()
  {
    $data['bgno'] = $this->config->item('bgnumber');
    $data['flist'] = $this->admin_model->load_font();
    $this->load->view('imggen/help',$data);
  }
}
?>