<?php
class User extends CI_Controller {
	public function __construct()
	{
		parent::__construct();
		$this->load->library('form_validation');
		$this->load->model('user_model');
		$this->load->helper('url');
        $this->load->helper('form');
        $this->load->helper('cookie');
	}
	function login(){
       
        $this->form_validation->set_rules('username', 'Username', 'trim|required|xss_clean|alpha_dash|callback_username_check');
        $this->form_validation->set_rules('password', 'Password', 'trim|required|md5|callback_password_check');
        $this->_username = $this->input->post('username');                //用户名
        
        $data['1'] = 1;
        $remember_me = $this->input->post('remember_me');
        $json_string = $this->input->cookie('userinfo');
        $userinfo_json = json_decode($json_string);
        if(isset($userinfo_json->username)){
            if ($this->username_check($userinfo_json->username)){
                $userinfo=$this->user_model->get_by_username($userinfo_json->username);
                $this->user_model->login($userinfo);
                $data['redirect_path']= base_url('admin/dashboard');
                if(isset($_GET['target'])){$data['redirect_path'] = base_url($_GET['target']);}
                $data['message']="You are being redirected. If you are not redirected, please click ".anchor($data['redirect_path'],"here").".";
            }
        }

        if ($this->form_validation->run()){
        	$userinfo=$this->user_model->get_by_username($this->_username);
            $this->user_model->login($userinfo);
            if($remember_me=="on"){$this->user_model->write_cookie($userinfo);}
                $data['redirect_path']= base_url('admin/dashboard');
                if(isset($_GET['target'])){$data['redirect_path'] = base_url($_GET['target']);}
                $data['message']="You are being redirected. If you are not redirected, please click ".anchor($data['redirect_path'],"here").".";
        }
        $this->load->view('account/login',$data);
        
       
    }
    function username_check($username){
        if ($this->user_model->get_by_username($username)){
            return TRUE;
        }else{
            $this->form_validation->set_message('username_check', 'User name not exist.');
            return FALSE;
        }
    }
    function password_check($password) {
        $password = md5($password);
        if ($this->user_model->password_check($this->_username, $password)){
            return TRUE;
        }else{
            $this->form_validation->set_message('password_check', 'Incorrect username or paswsword.');
            return FALSE;
        }
     }
    /**
     * 用户注册
     * 表单规则在配置文件:/config/form_validation.php
     * 错误提示信息在文件：/system/language/english/form_validation.php
     */
    function register(){
    	    $rule=array(                    //用户注册表单的规则
            array(
                'field'=>'username',
                'label'=>'User name',
                'rules'=>'trim|required|xss_clean|callback_username_exists'
            ),
            array(
                'field'=>'password',
                'label'=>'Paassword',
                'rules'=>'trim|required|min_length[4]|max_length[12]|matches[passwordconf]|md5|xss_clean'
            ),
            array(
                'field'=>'email',
                'label'=>'E-mail address',
                'rules'=>'trim|required|xss_clean|valid_email|callback_email_exists'
            )
        );
    	 $this->form_validation->set_rules($rule);
        //设置错误定界符
        $this->form_validation->set_error_delimiters('<span class="error">', '</span>');
        
        if ($this->form_validation->run() == FALSE) {
            $this->load->view('account/register');
        }else{
            $username = $this->input->post('username');
            $password = md5($this->input->post('password'));
            $email = $this->input->post('email');
            $display_name = $this->input->post('display_name');
            if ($this->user_model->add_user($username, $password, $email, $display_name)){
                $data['message'] = "The user account has now been created! You can go to "
                            .anchor('account/index', 'here').'.';
                $data['here'] = anchor("account/index", 'here');
            }else{
                $data['message'] = "There was a problem when adding your account. You can register "
                            .anchor('account/register', 'here').' again.';
                $data['here'] = anchor("account/register", 'here');
            }
            $this->load->view('account/note', $data);
        }
       }
    /**
     * ======================================
     * 用于注册表单验证的函数
     * 1、username_exists()
     * 2、email_exists()
     * ======================================
     */
    /**
     * 验证用户名是否被占用。
     * 存在返回false, 否者返回true.
     * @param string $username
     * @return boolean
     */
    function username_exists($username){
        if ($this->user_model->get_by_username($username)){
            $this->form_validation->set_message('username_exists', 'User name is not available.');
            return FALSE;
        }
        return TRUE;
    }
    function email_exists($email){
        if ($this->user_model->email_exists($email)){
            $this->form_validation->set_message('email_exists', 'E-mail is not available.');
            return FALSE;
        }
        return TRUE;
    }
    function logout(){
        delete_cookie("userinfo");
        if ($this->user_model->logout() == TRUE){
        	 $data['message']='Log out successfully!';
            $this->load->view('account/login',$data);
        }else{
        	 redirect('/', 'refresh');
        }
    }
}