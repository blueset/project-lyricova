<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class user_model extends CI_Model {
    public function __construct(){
        parent::__construct();
        $this->load->database();
        $this->load->library('session');
    }
	/**
      * 添加用户session数据,设置用户在线状态
      * @param string $username
      */
    function login($userinfo){
        $data = array('username'=>$userinfo->username,
         			   'user_id'=>$userinfo->id, 
         			   'role'=>$userinfo->role,
         			   'logged_in'=>TRUE);
        $this->session->set_userdata($data);                    //添加session数据
    }
    function write_cookie($userinfo){
        $user_json = json_encode($userinfo);
        $cookie = array(
            'name'   => 'userinfo',
            'value'  => $user_json,
            'expire' => '2592000'
        );
        $this->input->set_cookie($cookie);
    }
    /**
      * 通过用户名获得用户记录
      * @param string $username
      */
    function get_by_username($username){
        $this->db->where('username', $username);
        $query = $this->db->get('users');
        //return $query->row();                            //不判断获得什么直接返回
        if ($query->num_rows() == 1){
            return $query->row();
        }else{
            return FALSE;
        }
    }
     function get_by_id($id){	
     	$this->db->where('id', $id);
        $query = $this->db->get('users');
        if ($query->num_rows() == 1){
            return $query->row();
        }else{
            return FALSE;
        }
     }
     
     /**
      * 用户名不存在时,返回false
      * 用户名存在时，验证密码是否正确
      */
    function password_check($username, $password){                
         if($user = $this->get_by_username($username)){
             return $user->password == $password ? TRUE : FALSE;
         }
         return FALSE;  //当用户名不存在时
     }
     /**
      * 添加用户
      */
    function add_user($username, $password, $email, $display_name){
        $data = array('username'=>$username, 'password'=>$password, 'email'=>$email, 
         	           'display_name'=>$display_name ,'role'=>0);
        $this->db->insert('users', $data);
        if ($this->db->affected_rows() > 0){
             $this->login($username);
             return TRUE;
        }
        return FALSE;
    }
    public function update_profile($id=-1){
        $pw = ($this->input->post('newpwconf') == "")?$this->input->post('password'):$this->input->post('newpw');
        if ($id == -1){
            $data = array('username' => $this->input->post('username'),
                        'password' => md5($pw),
                        'email' => $this->input->post('email'),
                        'display_name' => $this->input->post('display_name'));
            $this->db->where('id', $this->get_session('user_id'));
        }else{
            $data = array('username' => $this->input->post('username'),
                        'password' => md5($pw),
                        'email' => $this->input->post('email'),
                        'role' => $this->input->post('role'),
                        'display_name' => $this->input->post('display_name'));
            $this->db->where('id', $id);
        }
        
        $this->db->update('users', $data);

        
     }
    function email_exists($email){
         $this->db->where('email', $email);
         $query = $this->db->get('users');
         return $query->num_rows() ? TRUE : FALSE;
    }
    public function get_session($data_name){
         if (isset( $this->session->userdata[$data_name]))
            return  $this->session->userdata[$data_name];
            else return null;
    }
    public function logged_in(){
         if( $this->get_session('logged_in')===TRUE){
            return TRUE;
         }else{
            return 'You have not logged in.';
         }
    }
    function logout(){
         if ($this->logged_in() === TRUE)
         {
             $this->session->sess_destroy();                //销毁所有session的数据

             return TRUE;
         }
         return FALSE;
    }
/*
     public function allow_to_post()
     {
         if(!$this->logged_in()===TRUE){return $this->logged_in();}else{
            if ($this->get_session('role')>0){return 'Your account is not eligible to post.';}
            else{return TRUE;}
         }
     }
     public function allow_to_edit($post)
     {
         if (!$this->allow_to_post()===TRUE){return $this->allow_to_post();}else{
            if ($this->get_session('role')==1 && $post->user_id == $this->get_session('user_id')){return TRUE;}
            elseif($this->get_session('role')>1){return TRUE;}
            else{return 'Your account is not eligible to edit this post.';}
         }
     }
     public function allow_to_delete($post)
     {
         if(!$this->allow_to_edit($post)===TRUE){return $this->allow_to_edit($post);}else{
            if($this->get_session('role')<=2 && $post->user_id == $this->get_session('user_id')){return TRUE;}
            elseif($this->get_session('role')==3){return TRUE;}
            else{return 'Your account is not eligible to delete this post.';}
         }
     }
     */
    public function get_user_number(){
        return $this->db->count_all('users');
    }
    public function is_own($user_id){
        $string = $this->session->userdata('user_id') == $user_id ? "_own" : "";
        return $string;
    }
    public function get_users($per_page=20,$offset=0){ 
        $query = $this->db->get('users',$per_page,$offset);
        return $query->result();
    }
    public function access_to($activity,$user_role=-1){
        /*
            用户等级设定：
            0：注册用户。
            1：投递者 允许发布，允许修改自己的
            2：编辑 允许发布，允许修改
            3：管理员 允许发布 允许修改 允许删除*/

        if ($user_role == -1){$user_role = (int)$this->session->userdata('role');}
        $table=array(
            "edit" => array( 0 => FALSE,
                             1 => FALSE,
                             2 => TRUE,
                             3 => TRUE),
            "edit_own" => array( 0 => FALSE,
                                 1 => TRUE,
                                 2 => TRUE,
                                 3 => TRUE),
            "delete" => array( 0 => FALSE,
                               1 => FALSE,
                               2 => TRUE,
                               3 => TRUE),
            "delete_own" => array( 0 => FALSE,
                                   1 => TRUE,
                                   2 => TRUE,
                                   3 => TRUE),
            "system_admin" => array( 0 => FALSE,
                                   1 => TRUE,
                                   2 => TRUE,
                                   3 => TRUE),

            "post" =>     array( 0 => FALSE,
                                 1 => TRUE,
                                 2 => TRUE,
                                 3 => TRUE)
            );
        return $table[$activity][$user_role];
    }
    public function delete_user($id){
        $this->db->where('id', $id);
        $this->db->delete('users');
        if($this->db->affected_rows()==0){
          return false;
        }else{
          return TRUE;
        }
    }

    public function get_usermeta($user_id,$key,$default=null){
        $query = $this->db->get_where('usermeta',array('user_id'=>$user_id,'meta_key'=>$key),1);
        return ($query->num_rows() == 0) ? $default : $query->row()->meta_value;
    }

    public function set_usermeta($user_id,$key,$value){
        $query = $this->db->get_where('usermeta',array('user_id'=>$user_id,'meta_key'=>$key),1);
        if ($query->num_rows() == 0)
            $query = $this->db->insert('usermeta', array('user_id'=>$user_id,'meta_key'=>$key,'meta_value'=>$value));
        else
            $query = $this->db->update('usermeta',array('meta_value'=>$value), array('user_id'=>$user_id,'meta_key'=>$key));
    }
}
