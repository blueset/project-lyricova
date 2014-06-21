<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit Images - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>List of image generated</h2>
			</div>
		</div>
		<div id="page-wrapper">
			<?php if($success){ ?>
				<div class="alert alert-success fade in ">
  					<a href="#" class="close" data-dismiss="alert">&times;</a>
  					<strong>Success!</strong> Image Deleted. 
				</div>
				<?php }?>
				<?php if(!$errinfo==''){ ?>
				<div class="alert alert-error fade in ">
  					<a href="#" class="close" data-dismiss="alert">&times;</a>
  					<strong>Error!</strong> <?=$errinfo?>
				</div>
				<?php } ?>
				<table class="table table-hover text-left post-list"><tbody>
					<tr>
						<!--<th><input type="checkbox" name="post-all" id="post-all"></th>-->
						<th>ID</th>
						<th>Meta</th>
						<th>Lyric</th>
						<th>Action</th>
					</tr>
					<?php foreach ($posts as $postitem): ?>
					<tr>
						<!--<td class="tick"><input type="checkbox" name="post-<?=$postitem->id?>" id="post-<?=$postitem->id?>"></td>-->
						<td class="id"><?=$postitem->id?></td>
						<td class="name"><?=$postitem->meta?></td>
						<td class="lyric"><?=$postitem->lyric?></td>
						<td class="action">							
							<?=anchor('imggen/edit/'.$postitem->id, 'Edit', 'class="btn btn-sm btn-primary"');?>
							<?=anchor('imggen/output/'.$postitem->id.'.png', 'Open', 'class="btn btn-sm btn-default"');?>
							<a href="javascript:void(0)" class="btn btn-danger btn-sm" onclick="delImgModal(<?=$page?>,<?=$postitem->id?>,'<?=jsize_string($postitem->lyric)?>');">Delete</a>
						</td>
					</tr>
					<?php endforeach; ?>
				<tbody></table>
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>
</body>
</html>
