<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Login - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php if(@$redirect_path != ''){echo '<script>window.location.replace("'.$redirect_path.'");</script>';} ?>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<div style="text-align:center;">
				<h1>Sign in</h1>	
				<p class="lead">Log into <?=$this->admin_model->get_title();?>.</p>
			</div>
		</div>
	</div>
	<div class="container">
		<div class="span5 offset3">
		<?php if(validation_errors() !== '' || @(!$err_message == '')){ ?>
		<div class="alert alert-error fade in">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Error!</strong> <?=validation_errors('<span>','</span>');?> <?=@$err_message?>
		</div>
		<?php } ?>
		<?php if(@$message!=''){ ?>
		<div class="alert fade in alert-success">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Success!</strong> <?=$message?>
		</div>
		<?php } ?>
			<?php echo form_open('login',array('class'=>'form-horizontal')); ?>
				<div class="control-group">
    				<label class="control-label" for="username">User name</label>
    				<div class="controls">
      					<input type="text" id="username" name="username" placeholder="User name">
    				</div>
    			</div>
  				<div class="control-group">
    				<label class="control-label" for="password">Password</label>
    				<div class="controls">
      					<input type="password" id="password" name="password" placeholder="Password">
    				</div>
  				</div>
  				<label for="remember_me" class="checkbox">
  					<input type="checkbox" id="remember_me" name="remember_me"> Remember me (30 days)
  				</label>
				<div style="text-align:center;">
					<input type="submit" name="submit" value="Log in" class="btn btn-primary">
				</div>
		</Form>
	</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>