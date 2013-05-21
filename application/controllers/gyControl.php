<?php 

class GyControl extends CI_Controller {
	public function __construct()
  {
    parent::__construct();
    $this->load->model('post_model');
    $this->load->model('user_model');
    $this->load->helper('url');
  }
	public function index($page=1){
		$this->load->library('pagination');
		$this->load->helper('string');
		$this->load->library('typography');

		$config['base_url'] = site_url('/');
		$config['total_rows'] = $this->post_model->get_post_number();
		$config['per_page'] = 20; 
		$config['uri_segment'] = 2; 

		$this->pagination->initialize($config); 
		$pageNum=$this->uri->segment(2)?$this->uri->segment(2):1;
	    if($pageNum==1){
   			$offset=0;
  		}else{
   			$offset=$config['per_page']*($pageNum-1);
  		}
		$data['posts'] = $this->post_model->get_post($config['per_page'],$offset);
		$this->load->view('gy/index',$data);
	}
	public function post(){
		$this->load->helper('form');
        $this->load->library('form_validation');

		$this->form_validation->set_rules('lyric', 'Lyric', 'required');
  		$this->form_validation->set_rules('name', 'Song Name', 'required');
  		$this->form_validation->set_rules('artist', 'Artist', 'required');
  		$data['success']=FALSE;
  		$data['errinfo']='';
  		$logged_in = $this->user_model->allow_to_post();
  		if (!$logged_in===TRUE){
  			$data['errinfo']=$logged_in;
  		}
  		$form_valid=$this->form_validation->run();
		if (($form_valid === FALSE) && !($logged_in===TRUE)){
			$this->load->view('gy/post',$data);
		}
  		else
  		{
    		$post_id = $this->post_model->post_item();
    		$data['success'] = TRUE;
        $data['is_post'] = TRUE;
    		redirect('/edit/'.$post_id.'?post=1'/*, 'refresh'*/);
  		}
	}
	public function edit($id){
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
  		$allow = $this->user_model->allow_to_edit($data['post']); //allow to post?
  		if (!$allow===TRUE){
  			$data['errinfo']=$allow;
  		}
  		//var_dump($this->input->post('submit'));
  		$clicked_post = $this->input->post('submit'); // "post" nutton clicked?
  		
  		
  		$form_valid=$this->form_validation->run();

  		if (($form_valid === FALSE) || ($clicked_post===FALSE) || !($allow===TRUE)){
			$this->load->view('gy/edit',$data);
		}
  		else
  		{
  			$this->post_model->edit_post($id);
  			$data['post']=$this->post_model->get_by_id($id);
    		$data['success'] = TRUE;
    		$this->load->view('gy/edit',$data);
  		}
	}
	public function delete($id)
	{
		//Init vars
  		$data['success']=FALSE;
  		$data['errinfo']='';
  		$data['post']=$this->post_model->get_by_id($id);
  		//Check Allowance
  		$allow = $this->user_model->allow_to_delete($data['post']); //allow to post?
  		if (!$allow===TRUE){
  			$data['errinfo']=$allow;
  		}
  		//Display
  		if (!($allow===TRUE)){
			$this->load->view('gy/delete',$data);
		}
  		else
  		{
  			$data['post']=$this->post_model->get_by_id($id);
  			if ($this->post_model->delete_post($id)){
    			$data['success'] = TRUE;
    			$this->load->view('gy/delete',$data);
    		}else{
    			$data['errinfo']='Delete failed';
    			$this->load->view('gy/delete',$data);
    		}
  		}
	}
}
