<?php 
	$logged_in = $this->session->userdata('logged_in'); 
	if ($logged_in){
		$user_id = $this->session->userdata('user_id');
	}
?>
<div class="navbar navbar-inverse navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container">
			<a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
        		<span class="icon-bar"></span>
        		<span class="icon-bar"></span>
        		<span class="icon-bar"></span>
      		</a>
			<a href="<?=site_url();?>" class="brand"><?=$this->admin_model->get_title();?></a>

			<div class="nav-collapse collapse">

			<ul class="nav">
				<li <?php echo ((uri_string() == "")?'class="active"':"");?>><a href="<?=site_url();?>">Home</a></li>
				<li <?php echo ((stripos(uri_string(),"imggen")!==FALSE)?'class="active"':"");?>><a href="<?=site_url('imggen/new');?>">Image Generator</a></li>
			</ul>
			<form class="navbar-search pull-left" method="get" accept-charset="utf-8" action="<?=site_url("s");?>">
				<div class="input-append">
    				<input type="text" name="q" placeholder="Search Project Gy" value="<?php if(isset($keyword)){echo $keyword;} ?>" class="span2 search-query">
  				</div>
			</form>
			<ul class="nav pull-right">
				<?php if($logged_in){?>
				<li class="dropdown">
					<a href="#" class="dropdown-toggle" data-toggle="dropdown">Welcome back, <?=$this->user_model->get_by_id($user_id)->display_name?> <b class="caret"></b></a>
					<ul class="dropdown-menu">
						<li><a href="<?=site_url('admin/dashboard');?>"><i class="icon-dashboard"></i> Dashboard</a></li>
						<li><a href="<?=site_url('admin/post');?>"><i class="icon-plus"></i> Post</a></li>

						<li><a href="<?=site_url('logout');?>"><i class="icon-signout"></i> Log out</a></li>
					</ul>
				</li>
				<?php }else{ ?>
				<li><a href="<?=site_url('login');?>">Log in</a></li>
				<li><a href="<?=site_url('register');?>">Register</a></li>
				<?php }?>
			</ul>

			</div>

		</div>
	</div>
</div>