<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>User Dashboard - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header single-head">
		<div class="container">
			<h2>Dashboard</h2>
		</div>
	</div>
	<div class="container container-fluid">
		<div class="row-fluid">
			<?php $this->load->view('admin/sidebar');?>
			<div class="span10">
				<h1>Welcome back, <?=$user->display_name?></h1>
				<div class="sortable row-fluid">
					<a class="well span3 top-block" href="#">
						<h1><?=$this->post_model->get_post_number()?></h1>
						<div>Posts published</div>
					</a>	
	
					<a class="well span3 top-block" href="#">
						<h1><?=$this->imggen_model->get_image_number()?></h1>
						<div>Images generated</div>
					</a>

					<a class="well span3 top-block" href="#">
						<h1><?=$this->user_model->get_user_number()?></h1>
						<div>Registered users</div>
					</a>
						
					<a class="well span3 top-block" data-placement="bottom" href="http://<?=$this->config->item('disqus_sname');?>.disqus.com">
						<h1><i class="icon-comments-alt"></i></h1>
						<div>Comments via Disqus</div>
					</a>
				</div>
				<div class="row-fluid">
					<div class="box span4">
						<div class="box-header well">
							<h2><i class="icon-user"></i> User Info</h2>
							<div class="box-icon">
								<a href="<?=site_url('admin/profile');?>" class="btn btn-setting btn-round"><i class="icon-cog"></i></a>
							</div>
						</div>
						<div class="box-content">
							<div class="media">
								<img src="<?=$gravatar_url?>" alt="Avatar" class="pull-left media-object">
								<div class="media-body">
									<h4 class="media-heading"><?=$user->display_name?> <small>(<?=$user->username?>)</small></h4>
									<p><b>Email:</b> <?=$user->email?><br>
									   <b>User ID:</b> <?=$user->id?><br>
									   <b>User Role:</b> <?=$user->role?></p>
								</div>
							</div>
							<a href="<?=site_url('admin/profile');?>" class="btn btn-block btn-large btn-primary">Edit Profile</a>
							<a href="http://gravatar.com" class="btn btn-block btn-large">Change Gravatar</a>
							<div class="clear-fix"></div>
						</div>	
					</div>
					<div class="box span8">
						<div class="box-header well">
							<h2><i class="icon-info"></i>  About</h2>
						</div>
						<div class="box-content">
							<p class="pull-right"><b>Current Version: </b><?=$this->config->item('current_version');?></p>
							<blockquote>
								<p>"A verse, a feeling, a recollection."</p>
								<small>Project Gy, a lyric-centered web-log.</small>
							</blockquote>
							<p>Project Gy, a lyric-centered web-log based on PHP and MySQL, created by Blueset Studio with iBe. (Actually, it's just me.)</p>
							<p>Through Project Gy, people can share their thoughts and feelings through existing lyrics, and share them with all over the world (just people who can see it =_=) by simply type in the lyric and some related information.</p>
							<div class="clear-fix"></div>
						</div>	
					</div>
				</div>
				<?php if($this->user_model->access_to("post")===TRUE): ?>
				<div class="row-fluid">
					<div class="box span12">
						<div class="box-header well">
							<h2><i class="icon-picture"></i> Dynamic Picture</h2>
						</div>
						<div class="box-content">
							<div class="row-fluid">
								<div class="span4">
									<h3>Get your dynamic picture now!</h3>
									<img src="<?=site_url('imggen/dynamic/'.$user->id.'.png');?>" alt="Dynamic Picture" style="width:100%;height:auto;">
								</div>
								<div class="span8">
									<p>HTML Code:</p>
									<textarea name="html" id="html" class="input-xxlarge" rows="2"><?=htmlspecialchars('<a href="'.base_url().'" title="'.$this->admin_model->get_title().'"><img src="'.site_url('imggen/dynamic/'.$user->id.'.png').'" title="'.$this->admin_model->get_title().'" /></a>');?></textarea>
									<p>BB Code:</p>
									<textarea name="html" id="html" class="input-xxlarge" rows="2"><?=htmlspecialchars('[url='.base_url().'][img]'.site_url('imggen/dynamic/'.$user->id.'.png').'[/img][/url]');?></textarea>
									<p>URL:</p>
									<textarea name="html" id="html" class="input-xxlarge" rows="2"><?=htmlspecialchars(site_url('imggen/dynamic/'.$user->id.'.png'));?></textarea>
								</div>
							</div>
							
							
							<div class="clear-fix"></div>
						</div>	
					</div>
					
				</div>
			<?php endif; ?>
			</div>
			
		</div>

	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>