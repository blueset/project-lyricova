<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>User Dashboard - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Dashboard</h2>
			</div>
		</div>
		<div id="page-wrapper">
			<div class="row-fluid">
					<h1>Welcome back, <?=$user->display_name?></h1>
					<div class="sortable row-fluid">
						<div class="col-md-3">
							<a class="well top-block" href="<?=site_url('admin/edit_list');?>">
								<h1><?=$this->post_model->get_post_number()?></h1>
								<div>Posts published</div>
							</a>
						</div>
		
						<div class="col-md-3">
							<a class="well top-block" href="<?=site_url('admin/image');?>">
								<h1><?=$this->imggen_model->get_image_number()?></h1>
								<div>Images generated</div>
							</a>
						</div>
		
						<div class="col-md-3">
							<a class="well top-block" href="<?=site_url('admin/users_list');?>">
								<h1><?=$this->user_model->get_user_number()?></h1>
								<div>Registered users</div>
							</a>
						</div>
						<?php if($this->config->item('disqus_sname') != ""): ?>	
						<div class="col-md-3">
							<a class="well top-block" data-placement="bottom" href="http://<?=$this->config->item('disqus_sname');?>.disqus.com">
								<h1><i class="fa fa-comments-o"></i></h1>
								<div>Comments via Disqus</div>
							</a>
						</div>
						<?php else: ?>
						<div class="col-md-3">
							<a class="well top-block" data-placement="bottom" href="http://disqus.com">
								<h1><i class="fa fa-comments-o"></i></h1>
								<div>Setup comment system</div>
							</a>
						</div>
						<?php endif ?>
					</div>
					<div class="row">
						<div class="col-md-4">
							<div class="panel panel-primary">
								<div class="panel-heading">
									<div class="pull-right">
										<a href="<?=site_url('admin/profile');?>" class="btn btn-default btn-xs"><i class="fa fa-cog"></i></a>
									</div>
									<h3 class="panel-title"><i class="fa fa-user"></i> User Info</h3>
								</div>
								<div class="panel-body">
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
									<a href="http://gravatar.com" class="btn btn-block btn-large btn-default">Change Gravatar</a>
									<div class="clear-fix"></div>
								</div>
							</div>
						</div>
						<div class="col-md-8">
							<div class="panel panel-primary">
								<div class="panel-heading">
									<h3 class="panel-title"><i class="fa fa-info"></i> About</h3>
								</div>
								<div class="panel-body">
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
					</div>
					<?php if($this->user_model->access_to("post")===TRUE): ?>
					<div class="row">
						<div class="col-md-12">
							<div class="panel panel-primary">
								<div class="panel-heading">
									<h3 class="panel-title"><i class="fa fa-picture-o"></i> Dynamic Picture</h3>
								</div>
								<div class="panel-body">
									<div class="row">
										<div class="col-md-4">
											<h3>Get your dynamic picture now!</h3>
											<img src="<?=site_url('imggen/dynamic/'.$user->id.'.png');?>" alt="Dynamic Picture" style="width:100%;height:auto;">
										</div>
										<div class="col-md-8">
											<p>HTML Code:</p>
											<textarea name="html" id="html" class="input-xxlarge form-control" rows="2"><?=htmlspecialchars('<a href="'.base_url().'" title="'.$this->admin_model->get_title().'"><img src="'.site_url('imggen/dynamic/'.$user->id.'.png').'" title="'.$this->admin_model->get_title().'" /></a>');?></textarea>
											<p>BB Code:</p>
											<textarea name="html" id="html" class="input-xxlarge form-control" rows="2"><?=htmlspecialchars('[url='.base_url().'][img]'.site_url('imggen/dynamic/'.$user->id.'.png').'[/img][/url]');?></textarea>
											<p>URL:</p>
											<textarea name="html" id="html" class="input-xxlarge form-control" rows="2"><?=htmlspecialchars(site_url('imggen/dynamic/'.$user->id.'.png'));?></textarea>
										</div>
									</div>
									
									
									<div class="clear-fix"></div>
								</div>
							</div>
						</div>
						
					</div>
				<?php endif; ?>
				</div>
		
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>
	
</body>
</html>