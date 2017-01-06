<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Post - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Post</h2>
			</div>
		</div>
		<div id="page-wrapper">
			<?php if(!validation_errors()=='' OR !$errinfo==''){ ?>
            <div class="alert alert-error fade in ">
                <a href="#" class="close" data-dismiss="alert">&times;</a>
                <strong>Error!</strong> <?=$errinfo?> <?=validation_errors('<span>','</span>');?>
            </div>
            <?php } ?>

            <?php echo form_open('admin/post'); ?>
                <div class="row post-languages-row">
                    <div class="col-sm-4">
                        <div class="form-group">
                            <label for="lang[ja]">Preset Language: ja</label>
                            <textarea name="lang[ja]" id="lang[ja]" cols="30" rows="10" class="form-control"><?php echo set_value('lang[ja]'); ?></textarea>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="form-group">
                            <label for="lang[zh]">Preset Language: zh</label>
                            <textarea name="lang[zh]" id="lang[zh]" cols="30" rows="10" class="form-control"><?php echo set_value('lang[zh]'); ?></textarea>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="form-group">
                            <label for="lang[en]">Preset Language: en</label>
                            <textarea name="lang[en]" id="lang[en]" cols="30" rows="10" class="form-control"><?php echo set_value('lang[en]'); ?></textarea>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-sm-6">
                        <div class="form-group">
                            <label for="name">Song Name</label>
                            <input type="text" id="name" name="name" class="form-control" placeholder="Oe lu Eana Hufwe" value="<?php echo set_value('name'); ?>">
                        </div>

                        <div class="form-group">
                            <div class="form-group" style="margin-bottom:0">
                                <label for="artist" class="control-label">by</label>
                                <div class="input-group" style="width: 100%;">
                                    <input type="text" id="artist" name="artist" value="<?php echo set_value('artist'); ?>" placeholder="Artist" class="form-control" style="-webkit-border-radius: 4px 0 0 4px;
                                -moz-border-radius: 4px 0 0 4px;
                                border-radius: 4px 0 0 4px;">
                                    <span class="input-group-addon" style="-webkit-border-radius: 0;
                                                        -moz-border-radius: 0;
                                                        border-radius: 0; margin: 0 -1px;">feat.</span>
                                    <input type="text" id="featuring" name="featuring" value="<?php echo set_value('featuring'); ?>" class="form-control" placeholder="(optional)">
                                </div>

                            </div>
                        </div>
                        <div class="form-group">
                            <label for="album" class="pull-left">in</label>
                            <input type="text" class="form-control" placeholder="Album (Optional)"  value="<?php echo set_value('album'); ?>" id="album" name="album">
                        </div>
                        <div class="row">
                            <div class="col-xs-6">
                                <div class="form-group">
                                    <label for="main">Main Language</label>
                                    <div class="btn-group button-row" data-toggle="buttons">
                                        <label class="btn btn-default<?=set_radio("main", "ja", true) ? " active" : ""?>">
                                            <input type="radio" name="main" id="ja" value="ja" autocomplete="off"<?=set_radio("main", "ja", true)?>> ja
                                        </label>
                                        <label class="btn btn-default<?=set_radio("main", "zh") ? " active" : ""?>">
                                            <input type="radio" name="main" id="zh" value="zh" autocomplete="off"<?=set_radio("main", "zh")?>> zh
                                        </label>
                                        <label class="btn btn-default<?=set_radio("main", "en") ? " active" : ""?>">
                                            <input type="radio" name="main" id="en" value="en" autocomplete="off"<?=set_radio("main", "en")?>> en
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xs-6">
                                <div class="form-group">
                                    <label for="main">Original Language</label>
                                    <div class="btn-group button-row" data-toggle="buttons">
                                        <label class="btn btn-default<?=set_radio("original", "ja", true) ? " active" : ""?>">
                                            <input type="radio" name="original" id="ja" value="ja" autocomplete="off"<?=set_radio("original", "ja", true)?>> ja
                                        </label>
                                        <label class="btn btn-default<?=set_radio("original", "zh") ? " active" : ""?>">
                                            <input type="radio" name="original" id="zh" value="zh" autocomplete="off"<?=set_radio("original", "zh")?>> zh
                                        </label>
                                        <label class="btn btn-default<?=set_radio("original", "en") ? " active" : ""?>">
                                            <input type="radio" name="original" id="en" value="en" autocomplete="off"<?=set_radio("original", "en")?>> en
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-sm-6">
                        <div class="form-group">
                            <label class="pull-left" for="translator">Translator</label>
                            <input type="text" class="form-control" placeholder="(optional)" id="translator" value="<?php echo set_value('translator'); ?>"  name="translator">
                        </div>
                        <div class="form-group">
                            <label for="comment">Comment</label>
                            <textarea name="comment" id="comment" name="comment" cols="30" rows="4" class="form-control" placeholder="(optional)"><?php echo set_value('comment'); ?></textarea>
                        </div>
                        <div class="form-group">
                            <label for="category">Category</label>
                            <div class="btn-group button-row" data-toggle="buttons">
                                <label class="btn btn-default <?=set_checkbox("category[]", "core") ? " active" : "" ?>">
                                    <input type="checkbox" name="category[]" value="core" autocomplete="off"<?=set_checkbox("category[]", "core")?>>Core
                                </label>
                                <label class="btn btn-default <?=set_checkbox("category[]", "dark") ? " active" : "" ?>">
                                    <input type="checkbox" name="category[]" value="dark" autocomplete="off"<?=set_checkbox("category[]", "dark")?>>Dark
                                </label>
                                <label class="btn btn-default <?=set_checkbox("category[]", "soft") ? " active" : "" ?>">
                                    <input type="checkbox" name="category[]" value="soft" autocomplete="off"<?=set_checkbox("category[]", "soft")?>>Soft
                                </label>
                                <label class="btn btn-default <?=set_checkbox("category[]", "light") ? " active" : "" ?>">
                                    <input type="checkbox" name="category[]" value="light" autocomplete="off"<?=set_checkbox("category[]", "light")?>>Light
                                </label>
                                <label class="btn btn-default <?=set_checkbox("category[]", "vivid") ? " active" : "" ?>">
                                    <input type="checkbox" name="category[]" value="vivid" autocomplete="off"<?=set_checkbox("category[]", "vivid")?>>Vivid
                                </label>
                                <label class="btn btn-default <?=set_checkbox("category[]", "sweet") ? " active" : "" ?>">
                                    <input type="checkbox" name="category[]" value="sweet" autocomplete="off"<?=set_checkbox("category[]", "sweet")?>>Sweet
                                </label>
                                <label class="btn btn-default <?=set_checkbox("category[]", "solid") ? " active" : "" ?>">
                                    <input type="checkbox" name="category[]" value="solid" autocomplete="off"<?=set_checkbox("category[]", "solid")?>>Solid
                                </label>
                            </div>
                        </div>
                        <input type="submit" name="submit" value="Submit" class="btn btn-primary">
                    </div>
                </div>

            </form>
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>
</body>
</html>