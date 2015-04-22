<?php 

class Admin extends CI_Controller {
  public function __construct()
  {
    parent::__construct();
    $this->load->model('post_model');
    $this->load->model('user_model');
    $this->load->model('admin_model');
    $this->load->model('imggen_model');
    $this->load->helper('url');
    if($this->user_model->logged_in() !== TRUE){redirect('login?target='.uri_string());}
    /*if($this->user_model->get_session('role') < 3){redirect('error/1');}*/
  }
  public function index()
  {
  	redirect('admin/dashboard','admin');
  }
 	public function dashboard()
 	{
 		$data['user']=$this->user_model->get_by_id($this->session->userdata('user_id'));
 		$data['gravatar_url'] = "http://www.gravatar.com/avatar/" . md5( strtolower( trim( $data['user']->email ) ) ) ./* "?d=" . urlencode( $default ) .*/ "&s=32";
 		$this->load->view('admin/dashboard',$data);
 	}
 	public function config()
 	{
    if( $this->user_model->access_to("system_admin") !== TRUE){ redirect('error/1'); die;}
 		//Init.....
 		$this->load->helper('form');
 		$item_list = array('title','banner','subbanner');
    if (!($this->input->post('submit') === false)){
      $this->admin_model->set_configs($item_list);
      $data['success']=true;
    }
    foreach($item_list as $item){
      $data['items'][$item]=htmlspecialchars($this->admin_model->get_config($item));
    }
 		$this->load->view('admin/config',$data);
 	}
  public function post()
  {
    if($this->user_model->access_to("post") !== TRUE){redirect('error/1');die;}
    $this->load->helper ('form');
    $this->load->library('form_validation');
    $this->form_validation->set_rules('lyric', 'Lyric', 'required');
    $this->form_validation->set_rules('name', 'Song Name', 'required');
    $this->form_validation->set_rules('artist', 'Artist', 'required');
    $data['success']=FALSE;
    $data['errinfo']='';
    $logged_in = $this->user_model->logged_in();
    if (!($logged_in===TRUE)){
      $data['errinfo']=$logged_in;
    }
    $form_valid=$this->form_validation->run();
    if (($form_valid === FALSE) || !($logged_in===TRUE)){
      $this->load->view('admin/post',$data);
    }
    else
    {
      $post_id = $this->post_model->post_item();
      $data['success'] = TRUE;
       $data['is_post'] = TRUE;
      redirect('/admin/edit/'.$post_id.'?post=1'/*, 'refresh'*/);
    }
  }
  public function edit($id)
  {
      //Load Helpers
      $this->load->helper('form');
      $this->load->library('form_validation');
      //Init Validation
      $this->form_validation->set_rules('lyric', 'Lyric', 'required');
      $this->form_validation->set_rules('name', 'Song Name', 'required');
      $this->form_validation->set_rules('artist', 'Artist', 'required');
      //Init vars
      $data['success']=FALSE;
      $data['errinfo']='';
      $data['post']=$this->post_model->get_by_id($id);
      //Post Allowance
      $allow = $this->user_model->access_to("post"); //allow to post?
      if (!$allow===TRUE){
        $data['errinfo']=$allow;
      }
      $own = $this->user_model->is_own($data['post']->user_id);
      if($this->user_model->access_to("edit".$own)!==TRUE){redirect('error/1');die;}
      //var_dump($this->input->post('submit'));
      $clicked_post = $this->input->post('submit'); // "post" nutton clicked?
      $form_valid=$this->form_validation->run(); // Form validation
      //IF item not exit
      if($data['post']===FALSE){
        $this->load->view('gy/404');}
      //Output Normal
      elseif (($form_valid === FALSE) || ($clicked_post===FALSE) || !($allow===TRUE)){
        $this->load->view('admin/edit',$data);
      }
      else // Process Edit
      {
        $this->post_model->edit_post($id);
        $data['post']=$this->post_model->get_by_id($id);
        $data['success'] = TRUE;
        $this->load->view('admin/edit',$data);
      }
  }
  public function edit_list($page=1)
  {
    if($this->user_model->access_to("edit_own")!==TRUE){redirect('error/1');die;}
    $this->load->library('pagination');
    $this->load->helper('string');
    $this->load->library('typography');
    $user_id = $this->user_model->access_to("edit")===TRUE ? -1 : (int)$this->session->userdata('user_id');
    $config['base_url'] = site_url('admin/edit_list');
    $config['total_rows'] = $this->post_model->get_post_number($user_id);
    $config['per_page'] = 20; 
    $config['uri_segment'] = 3; 
    $config['use_page_numbers'] = TRUE;
    $config['full_tag_open'] = '<div class="pagination"><ul>';
    $config['full_tag_close'] = '</ul></div>';
    $config['num_tag_open'] = '<li>';
    $config['num_tag_close'] = '</li>';
    $config['cur_tag_open'] = '<li class="active"><span>';
    $config['cur_tag_close'] = '</span></li>';
    $config['prev_tag_open'] = '<li>';
    $config['prev_tag_close'] = '</li>';
    $config['next_tag_open'] = '<li>';
    $config['next_tag_close'] = '</li>';

    $this->pagination->initialize($config); 
    $data['page']=$page;

    
    $pageNum=($this->uri->segment(3)>1)?$this->uri->segment(3):1;
      if($pageNum==1){
        $offset=0;
      }else{
        $offset=$config['per_page']*($pageNum-1);
      }
    $data['posts'] = $this->post_model->get_post($config['per_page'],$offset,$user_id);
    $this->load->view('admin/edit_list',$data);
  }
  public function profile()
  {
    $this->load->helper('form');
    $data['user']=$this->user_model->get_by_id($this->session->userdata('user_id'));

    $un_rule = 'trim|required|xss_clean';
    if ($this->input->post('username') !== "" && $data['user']->username !== $this->input->post('username')){
      $un_rule .="|is_unique[users.username]";
    }
    $em_rule = 'trim|required|xss_clean|valid_email';
    if ($this->input->post('email') !== "" && $data['user']->email !== $this->input->post('email')){
      $em_rule .="|is_unique[users.email]";
    }


    $this->load->library('form_validation');
    $this->form_validation->set_rules('username','Username',$un_rule);
    $this->form_validation->set_rules('password','Password','trim|required|min_length[4]|max_length[12]|pw_idencal|md5|xss_clean');
    $this->form_validation->set_rules('newpw','New Password','md5');
    $this->form_validation->set_rules('newpwconf','New Password Confirmation','match[newpw]');
    $this->form_validation->set_rules('email','E-mail',$em_rule);
    $this->form_validation->set_rules('display_name','Display name','required');

    $data['success']=FALSE;
    $clicked_post = $this->input->post('submit'); // "post" nutton clicked?
    $form_valid=$this->form_validation->run(); // Form validation

    
    $data['gravatar_url'] = "http://www.gravatar.com/avatar/" . md5( strtolower( trim( $data['user']->email ) ) ) ."&s=64";
    $data['user']=$this->user_model->get_by_id($this->session->userdata('user_id'));
    if (!($form_valid === false) && !($clicked_post===false)){
      $this->user_model->update_profile();
      $data['success']=true;
    }
    $this->load->view('admin/profile',$data);
  }
  function pw_idencal($password)
  {
         $password = md5($password);
         if ($this->user_model->password_check($this->_username, $password)){
             return TRUE;
         }else{
             $this->form_validation->set_message('pw_idencal', 'Incorrect paswsword.');
             return FALSE;
         }
  }
  public function image($page=1,$mode="",$id=-1)
  {
    if($this->user_model->access_to("edit_own")!==TRUE){redirect('error/1');die;}
    $this->load->library('pagination');
    $this->load->helper('string');
    $this->load->library('typography');
    $user_id = $this->user_model->access_to("edit")===TRUE ? -1 : (int)$this->session->userdata('user_id');
    $config['base_url'] = site_url('admin/image');
    $config['total_rows'] = $this->imggen_model->get_image_number($user_id);
    $config['per_page'] = 20; 
    $config['uri_segment'] = 3; 

    $this->pagination->initialize($config); 

    $pageNum=($this->uri->segment(3)>1)?$this->uri->segment(3):1;
      if($pageNum==1){
        $offset=0;
      }else{
        $offset=$config['per_page']*($pageNum-1);
      }
    
    $data['page']=$page;
    $data['success']=false;
    $data['errinfo']='';
    if($mode=="delete"){
      if($this->imggen_model->delete_image($id)){
        $data['success']=true;
      }else{
        $data['succeaa']=false;
        $data['errinfo']='Fail to delete image with id '.$id.'.';
      }
    }
    $data['posts'] = $this->imggen_model->get_image($config['per_page'],$offset,$user_id);
    $this->load->view('admin/image',$data);
  }
  public function users_list($page=1)
  {
    //accessibility check.
    if($this->user_model->access_to("system_admin")!==TRUE){redirect('error/1');die;}
    //init pagination
    $this->load->library('pagination');
    $this->load->helper('string');
    $this->load->library('typography');
    $config['base_url'] = site_url('admin/users_list');
    $config['total_rows'] = $this->user_model->get_user_number();
    $config['per_page'] = 20; 
    $config['uri_segment'] = 3; 
    $config['use_page_numbers'] = TRUE;
    $this->pagination->initialize($config); 
    $data['page']=$page;

    
    $pageNum=$page;
      if($pageNum==1){
        $offset=0;
      }else{
        $offset=$config['per_page']*($pageNum-1);
      }
    $data['posts'] = $this->user_model->get_users($config['per_page'],$offset);
    $this->load->view('admin/users_list',$data);
  }
  public function user_edit($id)
  {
    //accessibility check.
    if($this->user_model->access_to("system_admin")!==TRUE){redirect('error/1');die;}
    //init
    if(!isset($id)){redirect('admin/profile');die;}
    $this->load->helper('form');
    $data['user']=$this->user_model->get_by_id($id);

    $un_rule = 'trim|required|xss_clean';
    if ($this->input->post('username') !== "" && $data['user']->username !== $this->input->post('username')){
      $un_rule .="|is_unique[users.username]";
    }
    $em_rule = 'trim|required|xss_clean|valid_email';
    if ($this->input->post('email') !== "" && $data['user']->email !== $this->input->post('email')){
      $em_rule .="|is_unique[users.email]";
    }


    $this->load->library('form_validation');
    $this->form_validation->set_rules('username','Username',$un_rule);
    $this->form_validation->set_rules('newpw','New Password','md5');
    $this->form_validation->set_rules('newpwconf','New Password Confirmation','match[newpw]');
    $this->form_validation->set_rules('email','E-mail',$em_rule);
    $this->form_validation->set_rules('display_name','Display name','required');
    $this->form_validation->set_rules('role','User Role','required|numeric');

    $data['success']=FALSE;
    $clicked_post = $this->input->post('submit'); // "post" nutton clicked?
    $form_valid=$this->form_validation->run(); // Form validation

    
    $data['gravatar_url'] = "http://www.gravatar.com/avatar/" . md5( strtolower( trim( $data['user']->email ) ) ) ."&s=64";
    $data['user']=$this->user_model->get_by_id($id);
    if (!($form_valid === false) && !($clicked_post===false)){
      $this->user_model->update_profile($id);
      $data['success']=true;
    }
    $this->load->view('admin/user_edit',$data);
  }
  public function user_delete($id)
  {
    //accessibility check.
    if($this->user_model->access_to("system_admin")!==TRUE){redirect('error/1');die;}
    //Init vars
    $data['success']=FALSE;
    $data['errinfo']='';
    $data['post']=$this->user_model->get_by_id($id);
    //If post not exist
    if($data['post']===FALSE){$this->load->view('gy/404');}
    //Display
    else
    {
      $data['post']=$this->user_model->get_by_id($id);
      if ($this->user_model->delete_user($id)){
        $data['success'] = TRUE;
        $this->load->view('admin/user_delete',$data);
      }else{
        $data['errinfo']='Delete failed';
        $this->load->view('admin/user_delete',$data);
      }
    }
  }
  public function font()
  {
    $data['fonts'] = $this->admin_model->load_font();
    $this->load->view('admin/font', $data);
  }
  public function font_add()
  {
    //Stage 0: init
    $this->load->helper('form');
    //$this->load->helper('file');
    if($this->input->post('submit') === FALSE){
      $this->load->view('admin/font_add');
      return;
    }

    //Stage 1: Form validate
    $this->load->library('form_validation');
    $this->form_validation->set_rules('name','Font ID','trim|required|is_unique[fonts.name]|max_length[300]|alpha_dash');
    $this->form_validation->set_rules('caption','Font name','trim|required');
    if(!$this->form_validation->run()){
      $this->load->view('admin/font_add', array("errormsg", validation_errors()));
      return;
    }

    //Stage 2: font file validation 
    $config['upload_path'] = './fonts/';
    $config['allowed_types'] = '*';
    $config['file_name'] = $this->input->post("name");
    $config['max_size'] = '30720';
    $this->load->library('upload', $config);
    if ( ! $this->upload->do_upload("fontfile")){
      $this->load->view('admin/font_add', array("errormsg" => "Error occured when uploading the font file. ".$this->upload->display_errors()));
      return;
    }
    $font_file_data = $this->upload->data();
    if (!$this->imggen_model->font_validate($font_file_data["full_path"])){
      unlink($font_file_data["full_path"]);
      $this->load->view('admin/font_add', array("errormsg" => "Font uploaded is not valid."));
      return;
    }


    //Stage 3: Preview
    if($this->input->post("type") == "upload"){ //upload
      $config['file_name']=array();
      for ($i=0; $i < count($_FILES['name'])-1; $i++) { 
        $config['file_name'][$i] = $this->input->post("name")."-".$i.".png";
      }
      $config['allowed_types']="png|PNG|Png|image/png|image/x-png";
      $config['upload_path'] = './fonts/preview/';
      if(!$this->upload->do_multi_upload("previewfile")){
        $this->load->view('admin/font_add', array("errormsg" => $this->upload->display_errors()));
        return;
      }
    }else{ //Generate
      for ($i=0; $i < count($this->input->post("generate-text")); $i++) {
        $this->imggen_model->imggen_fontPreview ($this->input->post("generate-text")[$i],$this->input->post("name"),$this->input->post("name")."-".$i.".png");
      }
    }
    $this->admin_model->add_font_db($this->input->post("name"),$this->input->post("caption"));
    $this->load->view('gy/redirect',array("message"=>"Font has been uploaded successfully.",
                                          "here"=>"admin/font"));
  }
  public function font_delete($font_name)
  {
    if ($font_name == "") {
      $this->load->view('gy/redirect',array("message"=>"No font is selected",
                                            "here"=>"admin/font"));
      return;
    }
    if ($this->imggen_model->font_delete($font_name)){
      $this->load->view('gy/redirect',array("message"=>"Font has been deleted successfully.",
                                            "here"=>"admin/font"));
      return;
    }else{
      $this->load->view('gy/redirect',array("message"=>"Error occured while delete font.",
                                            "here"=>"admin/font"));
    }
  }
  public function testPage()
  {
    Header("Content-type: image/png"); 
    // Create the image
    $im = imagecreatetruecolor(400, 30);

    // Create some colors
    $white = imagecolorallocate($im, 255, 255, 255);
    $black = imagecolorallocate($im, 0, 0, 0);
    imagefilledrectangle($im, 0, 0, 399, 29, $white);

    // The text to draw
    $text = 'Testing...';
    // Replace path by your own font path
    putenv('GDFONTPATH=' . realpath('.'));
    $font = './fonts/SourceHanSansCN-Medium';

    // Add the text
    imagettftext($im, 20, 0, 10, 20, $black, $font, $text);

    // Using imagepng() results in clearer text compared with imagejpeg()
    imagepng($im);
    imagedestroy($im);
    
  }
  public function signature($id=-1)
  {
    //accessibility check.
    if(($this->user_model->access_to("system_admin")!==TRUE)&&(id!=-1)){redirect('error/1');die;}
    /** So, how should a signature customiser have?
     *
     * preview
     * bg-image uploader.
     * - change name and replace.
     * Font select
     * all the parameters
     * - text region: x/y offset, width, height
     * - position number: 1/2/3/4/5/6/7/8/9
     * - min size, max size, default size, line height (float)
     * - color
     * - alignment
     * - meta size, height (float)
     * - address?
     *
     */
    $this->load->helper("form");

    // load font list
    $data['fonts'] = $this->admin_model->load_font();

    $id = ($id == -1) ? (int)$this->session->userdata('user_id') : $id;
    $data["id"] = $id;

    // load settings
    
    $data['settings'] = json_decode($this->user_model->get_usermeta($id, 'signature', $this->admin_model->get_config('signature')),true);
    $data['settings']['bgimg'] = $this->imggen_model->get_dynamic_bg($id,false);
    //{"x_offset":160,"y_offset":40,"boxWidth":400,"boxHeight":250,"size":35,"lineheight":1.1,"metasize":20,"metalineh":1.1,"bgimg":"dyna-default.png","font":"","position":1,"minSize":20,"maxSize":50,"color":"#000000","align":"l"}
    
    if($this->input->post('submit') === FALSE){
      $this->load->view('admin/signature',$data);
      return;
    }

    // upload file
    $config['upload_path'] = './img/dyna-bg/';
    $config['allowed_types'] = 'image/png|image/x-png|png';
    $config['file_name'] = 'bg_'.(string)$id;
    $config['max_size'] = '20480';
    $config['overwrite'] = true;
    $this->load->library('upload', $config);
    if ( !$this->upload->do_upload("bgimg") && $this->upload->display_errors()!=="<p>You did not select a file to upload.</p>"){
      $this->load->view('admin/signature', array_merge($data, array("errormsg" => "Error occured when uploading the background picture. ".$this->upload->display_errors())));
      return;
    }

    // verify value
    $image_data = $this->upload->data();
    $this->load->library('form_validation');
    // $this->form_validation->set_rules('x-offset','X offset','trim|less_than['.(string)$image_data['image_width'].']');
    // $this->form_validation->set_rules('y-offset','Y offset','trim|less_than['.(string)$image_data['image_height'].']');
    // $this->form_validation->set_rules('width','Width','trim|greater_than['.(string)($image_data['image_width']-$this->input->post('x-offset').']'));
    // $this->form_validation->set_rules('height','Height','trim|greater_than['.(string)($image_data['image_height']-$this->input->post('y-offset').']'));
    $this->form_validation->set_rules('line-height','Line height','trim|greater_than[1]');
    $this->form_validation->set_rules('meta-line-height','Meta line height','trim|greater_than[1]');
    $this->form_validation->set_rules('min-size','Minimum size','trim|less_than['.(string)($this->input->post('default-size')).']');
    $this->form_validation->set_rules('max-size','Maximum size','trim|greater_than['.(string)($this->input->post('default-size')).']');

    if ($this->form_validation->run() === FALSE){
      $this->load->view('admin/signature', array_merge($data, array("errormsg" => validation_errors())));
      return;
    }

    // get everything to database
    $this->user_model->set_usermeta($id, 'signature', json_encode(array(
      "x_offset" => $this->input->post('x-offset'),
      "y_offset" => $this->input->post('y-offset'),
      "width" => $this->input->post('width'),
      "height" => $this->input->post('height'),
      "size" => $this->input->post('default-size'),
      "lineheight" => $this->input->post('line-height'),
      "metasize" => $this->input->post('meta-size'),
      "metalineh" => $this->input->post('meta-line-height'),
      "font" => $this->input->post('font'),
      "position" => $this->input->post('position'),
      "min_size" => $this->input->post('min-size'),
      "max_size" => $this->input->post('max-size'),
      "color" => $this->input->post('color'),
      "align" => $this->input->post('alignment'))));

    $data['success']=true;

    $this->load->view('admin/signature',$data);
  }
  // 
  // AJAX apis is written below.
  //
}
