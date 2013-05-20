<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Login - Project Gy - 歌语计划</title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<h1>Sign in</h1>	
			<p class="lead">Log into Project Gy.</p>
		</div>
	</div>
	<div class="container">
		<?php if(!validation_errors()==''){ ?>
		<div class="alert alert-error fade in">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Error!</strong> <?=validation_errors('<span>','</span>');?>
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
				<input type="submit" name="submit" value="Log in" class="btn btn-primary">
		</Form>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>