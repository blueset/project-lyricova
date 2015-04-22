<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Error - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<h1><?=$errmsg?></h1>
			<p class="lead">This is an error.</p>
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>