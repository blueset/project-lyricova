<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>404 - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header">
		<div class="container">
			<h1><?=lang('main_404_title');?></h1>
			<p class="lead"><?=lang('main_404_subtitle');?></p>			
		</div>
	</div>
	<div class="container">
		<div class="row cont404">
			<div class="span4">
				<div class="lhs404">
					<h2><?=lang('main_404_intitle');?></h2>
					<p><?=lang('main_404_insubtitle');?></p>
				</div>
			</div>
			<div class="span7 offset1">
				<blockquote>
					<div class="rhs404">
						<p><?=lang('main_404_rtext');?></p>
						<small><?=lang('main_404_small');?></small>
					</div>
				</blockquote>
			</div>
			<p><small><?=lang('main_404_footer');?></small></p>
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>