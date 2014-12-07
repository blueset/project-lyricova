<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Redirect - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="jumbotron header">
		<div class="container">
			<h1><?=$message?></h1>
			<p class="lead">If your are not redirected, click <?=anchor($here)?>.</p>			
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
<script>
	window.location.href="<?=base_url($here)?>";
</script>
</body>
</html>