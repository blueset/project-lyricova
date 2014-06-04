<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Notice - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="jumbotron header">
		<div class="container">
			<h1><?=$message?></h1>
			<p class="lead">If your are not redirected, click <?=$here?>.</p>			
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>