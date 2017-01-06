<?php
	$logged_in = $this->session->userdata('logged_in');
	if ($logged_in){
	$user_id = $this->session->userdata('user_id');
	}
?>
<div class="navbar navbar-inverse navbar-fixed-top">
	<div class="container">
      	<div class="navbar-header">
      		<button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#top-nav-bar">
      		    <span class="sr-only">Toggle navigation</span>
      		    <span class="icon-bar"></span>
      		    <span class="icon-bar"></span>
      		    <span class="icon-bar"></span>
      		</button>
      		<a href="<?=site_url();?>" class="navbar-brand"><?=$this->admin_model->get_title();?></a>
      	</div>

		<div id="top-nav-bar" class="collapse navbar-responsive-collapse navbar-collapse">

			<ul class="nav navbar-nav">
				<li <?php echo ((uri_string() == "")?'class="active"':"");?>><a href="<?=site_url();?>">Home</a></li>
				<li <?php echo ((stripos(uri_string(),"imggen")!==FALSE)?'class="active"':"");?>><a href="<?=site_url('imggen/new');?>">Image Generator</a></li>
				<li><a href="<?=site_url('screensaver/');?>">Screensaver</a></li>
			</ul>
			<form class="navbar-form navbar-left navbar-search" method="get" accept-charset="utf-8" action="<?=site_url("s");?>">
    				<input type="text" name="q" placeholder="Search <?=$this->admin_model->get_title();?>" value="<?php if(isset($keyword)){echo htmlspecialchars($keyword);} ?>" class="search-query span2 form-control">
			</form>
			<ul class="nav navbar-right navbar-nav">
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

		</div>

	</div>
</div>
