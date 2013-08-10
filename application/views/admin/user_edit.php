<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit user profile - <?=$this->admin_model->get_title();?></title>
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
				<h1>Edit User Profile</h1>
				<?php if(!(validation_errors()=='')){ ?>
				<div class="alert alert-error fade in ">
  					<a href="#" class="close" data-dismiss="alert">&times;</a>
  					<strong>Error!</strong> <?=validation_errors('<span>','</span>');?>
				</div>
				<?php } ?>
				<?php if($success){ ?>
				<div class="alert alert-success fade in ">
  					<a href="#" class="close" data-dismiss="alert">&times;</a>
  					<strong>Success!</strong> Edited. 
				</div>
				<?php }?>
				<div class="row-fluid">
					<div class="span3 text-center">
						<img src="<?=$gravatar_url?>" alt="Avatar from Gravatar"><br>
						<a href="http://gravatar.com" class="btn btn-primary">Change avatar</a><br>
						<small>via Gravatar.com</small>
						<p><small><a href="javascript:void(0);" id="gravatarhelp" data-toggle="popover"
									data-original-title="How is this picture obtained?"
									data-content="This picture is obtained from Global Recognizable Avatar (short for Gravatar). 
								Gravatar is a website that provide universal profile picture form site to site and can be easily changed through gravatar.com with effect in all the websites.
								We obtain this picture according the E-mail address you provided here, as well as the E-mail address you provided on Gravatar.com."
								data-placement="bottom">
							<i class="icon-question-sign"></i> How is this picture obtained?</a>
						</small></p>
					</div>
					<div class="span9">
						<?php echo form_open('admin/profile',array('class'=>'form-horizontal')); ?>
							<div class="control-group">
								<label for="id" class="control-label">User ID</label>
								<div class="controls"><input type="text" class="input-large" id="id" name="id" disabled value="<?=$user->id?>"></div>
							</div>
							<div class="control-group">
								<label for="username" class="control-label">Username</label>
								<div class="controls"><input type="text" class="input-large" id="username" name="username" value="<?=$user->username?>"></div>
							</div>
							<div class="control-group">
								<label for="newpw" class="control-label">New Password</label>
								<div class="controls"><input type="password" class="input-large" id="newpw" name="newpw"><span class="help-inline">Fill only when changing</span></div>
							</div>
							<div class="control-group">
								<label for="newpwconf" class="control-label">Confirm New Password</label>
								<div class="controls"><input type="password" class="input-large" id="newpwconf" name="newpwconf"><span class="help-inline">Same as above</span></div>
							</div>
							<div class="control-group">
								<label for="email" class="control-label">E-mail</label>
								<div class="controls"><input type="text" class="input-large" id="email" name="email" value="<?=$user->email?>"></div>
							</div>
							<div class="control-group">
								<label for="display_name" class="control-label">Display Name</label>
								<div class="controls"><input type="text" class="input-large" id="display_name" name="display_name" value="<?=$user->display_name?>"></div>
							</div>
							<!--
							div.control-group>label.control-label[for=id]{User ID}+.controls>input.input-large#id[name=id][value="<？=\$user->id?>"]
							-->
							
							<input type="submit" name="submit" value="Save" class="btn btn-primary">
						</form>
					</div>
				</div>
			</div>
			
		</div>

	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>