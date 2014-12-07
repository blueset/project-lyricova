<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Upload Font - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
				<div class="page-wrapper">
					<h2>Upload Font</h2>
				</div>
		</div>
		<div id="page-wrapper">
			<div class="row">
				<?php 
					if (!isset($errormsg)) {$errormsg = "";}
					$errormsg .= validation_errors();
					if ($errormsg != ''):?>
						<div class="alert alert-danger">
							<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
							<strong>Error: </strong> <?=$errormsg;?> 
						</div>
				<?php endif; ?>

				
				<?php echo form_open_multipart('admin/font_add',array("class"=>"form col-lg-8"));?>
					<div class="form-group"><label for="name">Font ID</label><input type="text" class="form-control" id="name" name="name" placeholder="Font ID"></div>
					<div class="form-group"><label for="caption">Font name</label><input type="text" class="form-control" id="caption" name="caption" placeholder="Font name"></div>
					<div class="form-group">
						<label for="file">Font file</label>
						<div class="input-group">
							<span class="input-group-btn"><span class="btn btn-default btn-file">Select file <input type="file" name="fontfile" accept=".ttf,.otf" size="20" /></span></span>
							<input type="text" id="file-path" class="form-control" readonly>
						</div>
					</div>

					<div style="display:none;">
						<input type="radio" name="type" id="upload-radio" value="upload" checked>
						<input type="radio" name="type" id="generate-radio" value="generate">
					</div>

					<ul class="nav nav-tabs" role="tablist">
						<li class="active"><a href="#upload" role="tab" data-toggle="tab">Upload</a></li>
						<li><a href="#generate" role="tab" data-toggle="tab">Generate</a></li>
					</ul>

					<div class="tab-content">
						<div id="upload" class="tab-pane fade in active">
							<b>Thumbnail file: </b>
							<p>Recommanded size: 450x50 px, transparent background. Only PNG files are allowed.</p>
							<div class="form-group preview-group">
								<div class="input-group">
									<span class="input-group-btn"><span class="btn btn-default btn-file">Select file <input type="file" name="previewfile[]" accept=".png" size="20" multiple/></span></span>
									<input type="text" id="file-path" class="form-control" placeholder="File path" readonly>
								</div>
							</div>
						</div>
						<div id="generate" class="tab-pane fade">
							<div class="btn-group pull-right">
								<a href="javascript:void(0)" onclick="add_generate('')" class="btn btn-success"><i class="fa fa-plus"></i> Add line</a>
								<a href="javascript:void(0)" class="btn btn-success dropdown-toggle" id="dropdowntoggle-addlines" data-toggle="dropdown"><i class="fa fa-caret-down"></i><span class="sr-only">More options</span></a>
								<ul class="dropdown-menu" data="menu">
									<li><a href="javascript:void(0)" onclick="add_generate('en')">English</a></li>
									<li><a href="javascript:void(0)" onclick="add_generate('zh-hans')">简体中文</a></li>
									<li><a href="javascript:void(0)" onclick="add_generate('zh-hant')">繁體中文</a></li>
									<li><a href="javascript:void(0)" onclick="add_generate('jp')">日本語</a></li>
									<li><a href="javascript:void(0)" onclick="add_generate('name')">Font name</a></li>
								</ul>
							</div>
							<b>Generate preview: </b>
							<p>Font preview can be generated automatically. Please only use characters that is included in this font.</p>
							<div class="form-group generate-group">
								<div class="input-group">
									<input type="text" name="generate-text[]" placeholder="Preview text" value="Project Gy, font preview." class="form-control">
									<span class="input-group-btn"><a href="javascript:void(0)" onclick="delete_preview_generate(this)" class="btn btn-danger"><i class="fa fa-times"></i></a></span>
								</div>
							</div>
						</div>
					</div>

					<div class="form-group">
						<input class="btn btn-default" type="submit" name="submit" value="Upload" />
					</div>
				</form>
			</div>
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>

<script>
/* Input file styling form http://www.surrealcms.com/blog/whipping-file-inputs-into-shape-with-bootstrap-3 */
$(document).on('change', '.btn-file :file', function() {
  var input = $(this),
      numFiles = input.get(0).files ? input.get(0).files.length : 1,
      label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
  input.trigger('fileselect', [numFiles, label]);
});

$(document).ready( function() {
    $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
        
        var input = $(this).parents('.input-group').find(':text'),
            log = numFiles > 1 ? numFiles + ' files selected' : label;
        
        if( input.length ) {
            input.val(log);
        } else {
            if( log ) alert(log);
        }
        
    });
});

/* Activate options when switching tab */
$('a[data-toggle="tab"]').on('show.bs.tab', function (e) {
	$($(e.target).attr("href")+"-radio").prop("checked",true)
});

/* Upload preview pictures */

function delete_preview_generate (obj) {
	if($(".generate-group").length>1){$(obj).parent().parent().parent().remove();}
		else{alert("Cannot remove the last item.")}
}

function add_generate (name) {
	var strTemplate = "";
	switch(name){
		case "name":
			if($("#name").val() != ""){
				strTemplate = $("#name").val();
			}else{
				alert("Please fill in font name first.");
				return;
			}
			break;
		case "en": 
			strTemplate = "Project Gy, font preview.";
			break;
		case "zh-hans":
			strTemplate = "歌语计划字体预览。";
			break;
		case "zh-hant":
			strTemplate = "歌語計劃字體預覽。";
			break;
		case "jp":
			strTemplate = "ぷろじぇくと ジーワィ 書体確認";
			break;
	}
	var newobj = $($(".generate-group")[0]).clone(true).appendTo("#generate");
	newobj.find(':text').val(strTemplate);
}
</script>
</body>
</html>