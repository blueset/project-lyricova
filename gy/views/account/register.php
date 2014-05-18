<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Register - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<div style="text-align:center;">
        <h1>Register</h1>  
        <p class="lead">Create a new account at Project Gy.</p>
      </div>
		</div>
	</div>
	<div class="container">
		<div class="span5 offset3">
      <?php if(!validation_errors()==''){ ?>
      <div class="alert alert-error fade in ">
              <a href="#" class="close" data-dismiss="alert">&times;</a>
              <strong>Error!</strong> <?=validation_errors();?>
      </div>
      <?php } ?>
        <?php echo form_open('register',array('class'=>'form-horizontal')); ?>
          <div class="control-group">
                  <label class="control-label" for="username">User name</label>
                  <div class="controls">
                      <input type="text" id="username" name="username" placeholder="User name">
                  </div>
                </div>
          <div class="control-group">
                  <label class="control-label" for="email">E-mail Address</label>
                  <div class="controls">
                      <input type="text" id="email" name="email" placeholder="E-mail Address">
                  </div>
                </div>
                <div class="control-group">
                  <label class="control-label" for="password">Password</label>
                  <div class="controls">
                      <input type="password" id="password" name="password" placeholder="Password">
                  </div>
                </div>
                <div class="control-group">
                  <label class="control-label" for="passwordconf">Password Confirm</label>
                  <div class="controls">
                      <input type="password" id="passwordconf" name="passwordconf" placeholder="Same as above">
                  </div>
                </div>
                <div class="control-group">
                  <label class="control-label" for="display_name">Display name</label>
                  <div class="controls">
                      <input type="text" id="display_name" name="display_name" placeholder="The name shown on the website.">
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