<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Font management - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<a href="<?=site_url('admin/font_add');?>" class="btn btn-primary pull-right">Add font</a>
				<h2>Font management</h2>
			</div>
		</div>
		<div id="page-wrapper">
			<div class="row">
				<?php foreach ($fonts as $font): ?>
				<?php 
					$is_exist = $this->admin_model->check_font($font->name);
				?>
				<?php if ($is_exist):?>
				<div class="col-sm-6 col-md-4">
					<div class="panel panel-default">
						<div class="panel-heading">
							<div class="btn btn-default btn-xs pull-right"><a href="javascript:void(0);" onclick="delFontModal('<?php echo $font->name; ?>','<?php echo $font->caption; ?>')"><i class="fa fa-times"></i></a></div>
							<?php echo $font->caption; ?>
						</div>
						<div class="panel-body">
						<?php 
							echo "Font ID: ".$font->name."<br>"; 
							$i=0;
							while (!(file_exists('./fonts/preview/'.$font->name.'-'.$i.'.png') == FALSE)) {
								echo '<img src="'.base_url('fonts/preview/'.$font->name.'-'.$i.'.png').'" class="font-preview" alt="'.$font->caption.' Preview '.$i.'" />'."<br>";

								$i+=1;
							}
							echo ($i==0) ? '<p class="text-danger">This font have no thumbnail.</p>' : "";
						?>
						</div>
					</div>
				</div>
				<?php else : ?>
				<div class="col-sm-6 col-md-4">
					<div class="panel panel-danger">
						<div class="panel-heading">
							<div class="btn btn-default btn-xs pull-right"><a href="javascript:void(0);" onclick="delFontModal('<?php echo $font->name; ?>','<?php echo $font->caption; ?>')"><i class="fa fa-times"></i></a></div>
							<?php echo $font->caption; ?>
						</div>
						<div class="panel-body">
							<p class="text-danger">This font is not valid.</p>
						</div>
					</div>
				</div>
				<?php endif; ?>
				<?php endforeach; ?>
			</div>
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>

	<div class="modal fade" id="Del" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  		<div class="modal-dialog">
    		<div class="modal-content">
      			<div class="modal-header">
        			<button type="button" class="close" data-dismiss="modal">
        			<span aria-hidden="true">&times;</span>
        			<span class="sr-only">Close</span></button>
        			<h4 class="modal-title" id="myModalLabel">Confirm Delete</h4>
      			</div>
      			<div class="modal-body">
        			<p>Are you sure you want to delete the following font?</p>
					<p id="del_info">....</p>
      			</div>
      			<div class="modal-footer">
        			<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        			<a href="#" class="btn btn-danger" id="btn-delete">Delete</a>
      			</div>
    		</div>
  		</div>
	</div>
<script type="text/javascript">
	function delFontModal(name,caption){
		$("#btn-delete").attr('href',currpath+'admin/font_delete/'+name);
		$("#del_info").html("Font: "+name+" ("+caption+")");
		$('.modal').modal('show');
	}
</script>
</body>
</html>