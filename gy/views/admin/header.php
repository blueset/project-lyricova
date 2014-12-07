<?php 
    $logged_in = $this->session->userdata('logged_in'); 
    if ($logged_in){
    $user_id = $this->session->userdata('user_id');
    }
?>
        <nav class="navbar navbar-default navbar-inverse navbar-fixed-top" role="navigation" style="margin-bottom: 0">
            <div class="navbar-header">
                <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".sidebar-collapse">
                    <span class="sr-only">Toggle navigation</span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                    <span class="icon-bar"></span>
                </button>
                <a href="<?=site_url();?>" class="navbar-brand"><?=$this->admin_model->get_title();?></a>
            </div>
            <!-- /.navbar-header -->
            <ul class="nav navbar-top-links navbar-right">
                    <?php if($logged_in){?>
                <li class="dropdown">
                    <a href="#" class="dropdown-toggle" data-toggle="dropdown">Welcome back, <?=$this->user_model->get_by_id($user_id)->display_name?> <b class="caret"></b></a>
                    <ul class="dropdown-menu">
                        <li><a href="<?=site_url('admin/dashboard');?>"><i class="fa fa-dashboard"></i> Dashboard</a></li>
                        <li><a href="<?=site_url('admin/post');?>"><i class="fa fa-plus"></i> Post</a></li>      
                        <li><a href="<?=site_url('logout');?>"><i class="fa fa-sign-out"></i> Log out</a></li>
                    </ul>
                </li>
                <?php }else{ ?>
                <li><a href="<?=site_url('login');?>">Log in</a></li>
                <li><a href="<?=site_url('register');?>">Register</a></li>
                <?php }?>
            </ul>

            <div class="navbar-default navbar-inverse navbar-static-side" role="navigation">
                <div class="sidebar-collapse">
                    <ul class="nav" id="side-menu">
                        <li>
                            <a href="<?=site_url('admin/dashboard');?>" class="ajaxlink">
                                <i class="fa fa-home"></i> Dashboard
                            </a>
                        </li>
                        <?php if($this->user_model->access_to("system_admin")===TRUE): ?>
                        <li>
                            <a href="<?=site_url('admin/config');?>" class="ajaxlink">
                                <i class="fa fa-wrench"></i> System
                            </a>
                        </li>
                        <?php endif; if($this->user_model->access_to("post")===TRUE):  ?>
                        <li>
                            <a href="<?=site_url('admin/post');?>" class="ajaxlink">
                                <i class="fa fa-plus"></i> Post
                            </a>
                        </li>
                        <?php endif; if($this->user_model->access_to("edit")===TRUE):  ?>
                        <li>
                            <a href="<?=site_url('admin/edit_list');?>" class="ajaxlink">
                                <i class="fa fa-edit"></i> Edit
                            </a>
                        </li>
                        <?php endif;?>
                        <li>
                            <a href="<?=site_url('admin/profile');?>" class="ajaxlink">
                                <i class="fa fa-user"></i> Profile
                            </a>
                        </li>
                        <?php if($this->user_model->access_to("system_admin")===TRUE):  ?>
                        <li>
                            <a href="<?=site_url('admin/image');?>" class="ajaxlink">
                                <i class="fa fa-picture-o"></i> Images
                            </a>
                        </li>
                        <li>
                            <a href="<?=site_url('admin/users_list');?>" class="ajaxlink">
                                <i class="fa fa-group"></i> Users
                            </a>
                        </li>
                        <li>
                            <a href="<?=site_url('admin/font');?>">
                                <i class="fa fa-font"></i> Fonts
                            </a>
                        </li>
                        <?php endif; ?>
                    </ul>
                    <!-- /#side-menu -->
                </div>
                <!-- /.sidebar-collapse -->
            </div>
            <!-- /.navbar-static-side -->
        </nav>
