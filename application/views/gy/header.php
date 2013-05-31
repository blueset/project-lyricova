<?php 
	$logged_in = $this->session->userdata('logged_in'); 
	if ($logged_in){
		$user_id = $this->session->userdata('user_id');
	}
?>
<div class="navbar navbar-inverse navbar-fixed-top">
	<div class="navbar-inner">
		<div class="container">
			<a href="<?=site_url();?>" class="brand">Project Gy</a>
			<ul class="nav">
				<li class="active"><a href="<?=site_url();?>">Home</a></li>
				<li><a href="<?=site_url('post');?>">Post</a></li>
				<li><a href="<?=site_url('imggen/new');?>">Image Generator</a></li>
			</ul>
			<form class="navbar-search pull-left" method="get" accept-charset="utf-8" action="<?=site_url("s");?>">
				<div class="input-append">
    				<input type="text" name="q" placeholder="Search Project Gy" value="<?php if(isset($keyword)){echo $keyword;} ?>" class="span2 search-query">
  				</div>
			</form>
			<ul class="nav pull-right">
				<?php if($logged_in){?>
				<li><a href="#">Welcome back, <?=$this->user_model->get_by_id($user_id)->display_name?></a></li>
				<li><a href="<?=site_url('logout');?>">Log out</a></li>
				<?php }else{ ?>
				<li><a href="<?=site_url('login');?>">Log in</a></li>
				<li><a href="<?=site_url('register');?>">Register</a></li>
				<?php }?>
			</ul>
		</div>
	</div>
</div>