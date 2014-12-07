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
	<div class="jumbotron header">
		<div class="container">
			<div style="text-align:center;">
				<h1>Sign in</h1>	
				<p class="lead">Log into <?=$this->admin_model->get_title();?>.</p>
			</div>
		</div>
	</div>
	<div class="container">
		<div style="max-width:300px" class="center-block">
		<?php if(validation_errors() !== '' || @(!$err_message == '')){ ?>
		<div class="alert alert-error fade in alert-warning alert-dismissable">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Error!</strong> <?=validation_errors('<span>','</span>');?> <?=@$err_message?>
		</div>
		<?php } ?>
		<?php if(@$message!=''){ ?>
		<div class="alert fade in alert-success alert-success alert-dismissable">
  			<a href="#" class="close" data-dismiss="alert">&times;</a>
  			<strong>Success!</strong> <?=$message?>
		</div>
		<?php } ?>
			<?php if(isset($_GET['target'])){echo form_open('login?target='.htmlspecialchars($_GET['target']),array('class'=>'form-horizontal'));}else{echo form_open('login',array('class'=>'form-horizontal'));} ?>
				<div class="form-group">
    				<input type="text" class="form-control" id="username" name="username" placeholder="User name">
    			</div>
  				<div class="form-group">
      				<input type="password" class="form-control" id="password" name="password" placeholder="Password">
  				</div>
  				<div class="form-group">
    				<div class="col-sm-offset-2 col-sm-10">
      					<div class="checkbox" id="remember_me" name="remember_me">
        					<label>
          						<input type="checkbox"> Remember me (30 days)
        					</label>
      					</div>
    				</div>
  				</div>
				<div style="text-align:center;">
					<input type="submit" name="submit" value="Log in" class="btn btn-primary form-control">
				</div>
		</Form>
	</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>