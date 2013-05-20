<?php 
/*
用户等级设定：
0：注册用户。
1：投递者 允许发布，允许修改自己的
2：编辑 允许发布，允许修改
3：管理员 允许发布 允许修改 允许删除*/
class user_model extends CI_Model {
	public function __construct()
  {
    parent::__construct();
    $this->load->database();
    $this->load->library('session');

  }
	/**
      * 添加用户session数据,设置用户在线状态
      * @param string $username
      */
     function login($userinfo)
     {
         $data = array('username'=>$userinfo->username,
         			   'user_id'=>$userinfo->id, 
         			   'role'=>$userinfo->role,
         			   'logged_in'=>TRUE);
         $this->session->set_userdata($data);                    //添加session数据
     }
     /**
      * 通过用户名获得用户记录
      * @param string $username
      */
     function get_by_username($username)
     {
         $this->db->where('username', $username);
         $query = $this->db->get('users');
         //return $query->row();                            //不判断获得什么直接返回
         if ($query->num_rows() == 1)
         {
             return $query->row();
         }
         else
         {
             return FALSE;
         }
     }
     function get_by_id($id){	
     	$this->db->where('id', $id);
        $query = $this->db->get('users');
        if ($query->num_rows() == 1)
        {
            return $query->row();
        }
        else
        {
            return FALSE;
        }
     }
     
     /**
      * 用户名不存在时,返回false
      * 用户名存在时，验证密码是否正确
      */
     function password_check($username, $password)
     {                
         if($user = $this->get_by_username($username))
         {
             return $user->password == $password ? TRUE : FALSE;
         }
         return FALSE;                                    //当用户名不存在时
     }
     /**
      * 添加用户
      */
     function add_user($username, $password, $email, $display_name)
     {
         $data = array('username'=>$username, 'password'=>$password, 'email'=>$email, 
         	           'display_name'=>$display_name ,'role'=>0);
         $this->db->insert('users', $data);
         if ($this->db->affected_rows() > 0)
         {
             $this->login($username);
             return TRUE;
         }
         return FALSE;
     }
 /**
      * 检查邮箱账号是否存在.
      * @param string $email
      * @return boolean
      */
     function email_exists($email)
     {
         $this->db->where('email', $email);
         $query = $this->db->get('users');
         return $query->num_rows() ? TRUE : FALSE;
     }
    public function logged_in()
     {
         if( ! $this->session->userdata['logged_in']===TRUE){
            return TRUE;
         }else{
            return 'You have not logged in.';
         }
     }
     function logout()
     {
         if ($this->logged_in() === TRUE)
         {
             $this->session->sess_destroy();                //销毁所有session的数据

             return TRUE;
         }
         return FALSE;
     }

     public function allow_to_post()
     {
         if(!$this->logged_in()===TRUE){return $this->logged_in();}else{
            if ($this->session->userdata['role']>0){return 'Your account is not eligible to post.';}
            else{return TRUE;}
         }
     }
     public function allow_to_edit($post)
     {
         if (!$this->allow_to_post()===TRUE){return $this->allow_to_post();}else{
            if ($this->session->userdata['role']==1 && $post->user_id == $this->session->userdata['user_id']){return TRUE;}
            elseif($this->session->userdata['role']>1){return TRUE;}
            else{return 'Your account is not eligible to edit this post.';}
         }
     }
     public function allow_to_delete($post)
     {
         if(!$this->allow_to_edit($post)===TRUE){return $this->allow_to_edit($post);}else{
            if($this->session->userdata['role']==2 && $post->user_id == $this->session->userdata['user_id']){return TRUE;}
            elseif($this->session->userdata['role']==3){return TRUE;}
            else{return 'Your account is not eligible to delete this post.';}
         }
     }
}
