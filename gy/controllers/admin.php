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
    $this->load->helper('form');
    $config['upload_path'] = './fonts/';
    $config['allowed_types'] = 'ttf|txt|TTF|TXT|Ttf';
    $config['max_size'] = '10240';
    var_dump($_FILES);
    $this->load->library('upload', $config);
    $data = array();
    /*
    if ( ! $this->upload->do_upload("fontfile"))
      {$data['error'] => $this->upload->display_errors());} 
    else
      {$data['upload_data'] => $this->upload->data());}
    */
    $this->load->view('admin/font_add',$data);
  }
  // 
  // AJAX apis is written below.
  //
}
