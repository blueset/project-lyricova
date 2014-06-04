<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit user profile - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Profile</h2>
			</div>
		</div>
		<div id="page-wrapper">
			<h1>Profile</h1>
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
					<div class="col-sm-3 text-center">
						<img src="<?=$gravatar_url?>" alt="Avatar from Gravatar"><br>
						<a href="http://gravatar.com" class="btn btn-primary">Change your avatar</a><br>
						<small>via Gravatar.com</small>
						<p><small><a href="javascript:void(0);" id="gravatarhelp" data-toggle="popover"
									data-original-title="How is this picture obtained?"
									data-content="This picture is obtained from Global Recognizable Avatar (short for Gravatar). 
								Gravatar is a website that provide universal profile picture form site to site and can be easily changed through gravatar.com with effect in all the websites.
								We obtain this picture according the E-mail address you provided here, as well as the E-mail address you provided on Gravatar.com."
								data-placement="bottom">
							<i class="fa fa-question-circle"></i> How is this picture obtained?</a>
						</small></p>
					</div>
					<div class="col-sm-9">
						<?php echo form_open('admin/profile',array('class'=>'form-horizontal')); ?>
							<div class="form-group">
								<label for="id" class="control-label col-sm-3">User ID</label>
								<div class="controls col-sm-9"><input type="text" class="form-control" id="id" name="id" disabled value="<?=$user->id?>"></div>
							</div>
							<div class="form-group">
								<label for="username" class="control-label col-sm-3">Username</label>
								<div class="controls col-sm-9"><input type="text" class="form-control" id="username" name="username" value="<?=$user->username?>"></div>
							</div>
							<div class="form-group">
								<label for="role" class="control-label col-sm-3">User role</label>
								<div class="controls col-sm-9"><input type="text" class="form-control" id="role" name="role" value="<?=$user->role?>"></div>
							</div>
							<div class="form-group">
								<label for="password" class="control-label col-sm-3">Current Password</label>
								<div class="controls col-sm-9"><input type="password" class="form-control" id="password" name="password"></div>
							</div>
							<div class="form-group">
								<label for="newpw" class="control-label col-sm-3">New Password</label>
								<div class="controls col-sm-9"><input type="password" class="form-control" id="newpw" name="newpw" placeholder="Fill only when changing"></div>
							</div>
							<div class="form-group">
								<label for="newpwconf" class="control-label col-sm-3">Confirm New Password</label>
								<div class="controls col-sm-9"><input type="password" class="form-control" id="newpwconf" name="newpwconf" placeholder="Same as above"></div>
							</div>
							<div class="form-group">
								<label for="email" class="control-label col-sm-3">E-mail</label>
								<div class="controls col-sm-9"><input type="text" class="form-control" id="email" name="email" value="<?=$user->email?>"></div>
							</div>
							<div class="form-group">
								<label for="display_name" class="control-label col-sm-3">Display Name</label>
								<div class="controls col-sm-9"><input type="text" class="form-control" id="display_name" name="display_name" value="<?=$user->display_name?>"></div>
							</div>
							<!--
							div.form-group>label.control-label[for=id]{User ID}+.controls>input.input-large#id[name=id][value="<？=\$user->id?>"]
							-->
							
							<input type="submit" name="submit" value="Save" class="btn btn-primary">
						</form>
					</div>
				</div>
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>
</body>
</html>