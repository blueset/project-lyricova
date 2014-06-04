<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Register - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="jumbotron header">
		<div class="container">
			<div style="text-align:center;">
        <h1>Register</h1>  
        <p class="lead">Create a new account at <?=$this->admin_model->get_title();?>.</p>
      </div>
		</div>
	</div>
	<div class="container">
		<div style="max-width:300px" class="center-block">
      <?php if(!validation_errors()==''){ ?>
      <div class="alert alert-error fade in alert-warning alert-dismissable">
              <a href="#" class="close" data-dismiss="alert">&times;</a>
              <strong>Error!</strong> <?=validation_errors();?>
      </div>
      <?php } ?>
        <?php echo form_open('register',array('class'=>'form-horizontal')); ?>
                <div class="form-group">
                  <div>
                      <input type="text" id="username" name="username" placeholder="User name" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <div>
                      <input type="text" id="email" name="email" placeholder="E-mail Address" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <div>
                      <input type="password" id="password" name="password" placeholder="Password" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <div>
                      <input type="password" id="passwordconf" name="passwordconf" placeholder="Password Confirm" class="form-control">
                  </div>
                </div>
                <div class="form-group">
                  <div class="controls">
                      <input type="text" id="display_name" name="display_name" placeholder="Display name" class="form-control">
                  </div>
                </div>
              <div style="text-align:center;">
                <input type="submit" name="submit" value="Register" class="btn btn-primary">
              </div>
      </Form>
    </div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>