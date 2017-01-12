<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Edit <small><?=$post->name?> with ID <?=$post->id?></small></h2>
			</div>
		</div>
		<div id="page-wrapper">
			<?php if($success){ ?>
            <div class="alert alert-success fade in ">
                <a href="#" class="close" data-dismiss="alert">&times;</a>
                <strong>Success!</strong> Edited. <?=anchor('post/'.$post->id, 'View post');?>
            </div>
            <?php } 
                  if(@$_GET['post'] === '1' ){ ?>
            <div class="alert alert-success fade in ">
                <a href="#" class="close" data-dismiss="alert">&times;</a>
                <strong>Success!</strong> Post has been sent to the database.　<?=anchor('post/'.$post->id, 'View post');?>
            </div>
            <?php } ?>

            <?php if(!validation_errors()=='' OR !$errinfo==''){ ?>
            <div class="alert alert-error fade in ">
                <a href="#" class="close" data-dismiss="alert">&times;</a>
                <strong>Error!</strong> <?=$errinfo?> <?=validation_errors('<span>','</span>');?>
            </div>
            <?php } ?>

            <?php echo form_open('admin/edit/'.$post->id,array('class'=>'row-fluid')); ?>
            <div class="row post-languages-row">
                <div class="col-sm-4">
                    <div class="form-group">
                        <label for="lang[ja]">Preset Language: ja</label>
                        <textarea name="lang[ja]" id="lang[ja]" cols="30" rows="10" class="form-control"><?php echo set_value('lang[ja]', $language['ja']); ?></textarea>
                    </div>
                </div>
                <div class="col-sm-4">
                    <div class="form-group">
                        <label for="lang[zh]">Preset Language: zh</label>
                        <textarea name="lang[zh]" id="lang[zh]" cols="30" rows="10" class="form-control"><?php echo set_value('lang[zh]', $language['zh']); ?></textarea>
                    </div>
                </div>
                <div class="col-sm-4">
                    <div class="form-group">
                        <label for="lang[en]">Preset Language: en</label>
                        <textarea name="lang[en]" id="lang[en]" cols="30" rows="10" class="form-control"><?php echo set_value('lang[en]', $language['en']); ?></textarea>
                    </div>
                </div>
            </div>
            <div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">
                <div class="panel panel-default">
                    <div class="panel-heading" role="tab" id="headingOne">
                        <h4 class="panel-title">
                            <a role="button" data-toggle="collapse" data-parent="#accordion" href="#romanize" aria-expanded="false" aria-controls="romanize">
                                Romanization
                            </a>
                        </h4>
                    </div>
                    <div id="romanize" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">
                        <div class="panel-body">
                            <div class="col-sm-4">
                                <div class="form-group">
                                    <label for="romanize[ja]">Preset Language: ja <button class="btn btn-default btn-xs" type="button" id="romanize_reset_ja">Reset</button></label>
                                    <textarea name="romanize[ja]" id="romanize[ja]" cols="30" rows="10" class="form-control"><?php echo set_value('romanize[ja]', $romanize['ja']); ?></textarea>
                                </div>
                            </div>
                            <div class="col-sm-4">
                                <div class="form-group">
                                    <label for="romanize[zh]">Preset Language: zh <button class="btn btn-default btn-xs" type="button" id="romanize_reset_zh">Reset</button></label>
                                    <textarea name="romanize[zh]" id="romanize[zh]" cols="30" rows="10" class="form-control"><?php echo set_value('romanize[zh]', $romanize['zh']); ?></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm-6">
                    <div class="form-group">
                        <label for="name">Song Name</label>
                        <input type="text" id="name" name="name" class="form-control" placeholder="Oe lu Eana Hufwe" value="<?php echo set_value('name', $post->name); ?>">
                    </div>

                    <div class="form-group">
                        <div class="form-group" style="margin-bottom:0">
                            <label for="artist" class="control-label">by</label>
                            <div class="input-group" style="width: 100%;">
                                <input type="text" id="artist" name="artist" value="<?php echo set_value('artist', $post->artist); ?>" placeholder="Artist" class="form-control" style="-webkit-border-radius: 4px 0 0 4px;
                                -moz-border-radius: 4px 0 0 4px;
                                border-radius: 4px 0 0 4px;">
                                <span class="input-group-addon" style="-webkit-border-radius: 0;
                                                        -moz-border-radius: 0;
                                                        border-radius: 0; margin: 0 -1px;">feat.</span>
                                <input type="text" id="featuring" name="featuring" value="<?php echo set_value('featuring', $post->featuring); ?>" class="form-control" placeholder="(optional)">
                            </div>

                        </div>
                    </div>
                    <div class="form-group">
                        <label for="album" class="pull-left">in</label>
                        <input type="text" class="form-control" placeholder="Album (Optional)"  value="<?php echo set_value('album', $post->album); ?>" id="album" name="album">
                    </div>
                    <div class="row">
                        <div class="col-xs-6">
                            <div class="form-group">
                                <label for="main">Main Language</label>
                                <div class="btn-group button-row" data-toggle="buttons">
                                    <label class="btn btn-default<?=set_radio("main", "ja", $language['main'] == "ja") ? " active" : ""?>">
                                        <input type="radio" name="main" id="ja" value="ja" autocomplete="off"<?=set_radio("main", "ja", $language['main'] == "ja")?>> ja
                                    </label>
                                    <label class="btn btn-default<?=set_radio("main", "zh", $language['main'] == "zh") ? " active" : ""?>">
                                        <input type="radio" name="main" id="zh" value="zh" autocomplete="off"<?=set_radio("main", "zh", $language['main'] == "zh")?>> zh
                                    </label>
                                    <label class="btn btn-default<?=set_radio("main", "en", $language['main'] == "en") ? " active" : ""?>">
                                        <input type="radio" name="main" id="en" value="en" autocomplete="off"<?=set_radio("main", "en", $language['main'] == "en")?>> en
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col-xs-6">
                            <div class="form-group">
                                <label for="main">Original Language</label>
                                <div class="btn-group button-row" data-toggle="buttons">
                                    <label class="btn btn-default<?=set_radio("original", "ja", $language['orig'] == "ja") ? " active" : ""?>">
                                        <input type="radio" name="original" id="ja" value="ja" autocomplete="off"<?=set_radio("original", "ja", $language['orig'] == "ja")?>> ja
                                    </label>
                                    <label class="btn btn-default<?=set_radio("original", "zh", $language['orig'] == "zh") ? " active" : ""?>">
                                        <input type="radio" name="original" id="zh" value="zh" autocomplete="off"<?=set_radio("original", "zh", $language['orig'] == "zh")?>> zh
                                    </label>
                                    <label class="btn btn-default<?=set_radio("original", "en", $language['orig'] == "en") ? " active" : ""?>">
                                        <input type="radio" name="original" id="en" value="en" autocomplete="off"<?=set_radio("original", "en", $language['orig'] == "en")?>> en
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-sm-6">
                    <div class="form-group">
                        <label class="pull-left" for="translator">Translator</label>
                        <input type="text" class="form-control" placeholder="(optional)" id="translator" value="<?php echo set_value('translator', $post->translator); ?>"  name="translator">
                    </div>
                    <div class="form-group">
                        <label for="comment">Comment</label>
                        <textarea name="comment" id="comment" name="comment" cols="30" rows="4" class="form-control" placeholder="(optional)"><?php echo set_value('comment', $post->comment); ?></textarea>
                    </div>
                    <div class="form-group">
                        <label for="category">Category</label>
                        <div class="btn-group button-row" data-toggle="buttons">
                            <label class="btn btn-default <?=set_checkbox("category", "core", in_array("core", $category)) ? " active" : "" ?>">
                                <input type="checkbox" name="category[]" value="core" autocomplete="off"<?=set_checkbox("category", "core", in_array("core", $category))?>>Core
                            </label>
                            <label class="btn btn-default <?=set_checkbox("category", "dark", in_array("dark", $category)) ? " active" : "" ?>">
                                <input type="checkbox" name="category[]" value="dark" autocomplete="off"<?=set_checkbox("category", "dark", in_array("dark", $category))?>>Dark
                            </label>
                            <label class="btn btn-default <?=set_checkbox("category", "soft", in_array("soft", $category)) ? " active" : "" ?>">
                                <input type="checkbox" name="category[]" value="soft" autocomplete="off"<?=set_checkbox("category", "soft", in_array("soft", $category))?>>Soft
                            </label>
                            <label class="btn btn-default <?=set_checkbox("category", "light", in_array("light", $category)) ? " active" : "" ?>">
                                <input type="checkbox" name="category[]" value="light" autocomplete="off"<?=set_checkbox("category", "light", in_array("light", $category))?>>Light
                            </label>
                            <label class="btn btn-default <?=set_checkbox("category", "vivid", in_array("vivid", $category)) ? " active" : "" ?>">
                                <input type="checkbox" name="category[]" value="vivid" autocomplete="off"<?=set_checkbox("category", "vivid", in_array("vivid", $category))?>>Vivid
                            </label>
                            <label class="btn btn-default <?=set_checkbox("category", "sweet", in_array("sweet", $category)) ? " active" : "" ?>">
                                <input type="checkbox" name="category[]" value="sweet" autocomplete="off"<?=set_checkbox("category", "sweet", in_array("sweet", $category))?>>Sweet
                            </label>
                            <label class="btn btn-default <?=set_checkbox("category", "solid", in_array("solid", $category)) ? " active" : "" ?>">
                                <input type="checkbox" name="category[]" value="solid" autocomplete="off"<?=set_checkbox("category", "solid", in_array("solid", $category))?>>Solid
                            </label>
                        </div>
                    </div>
                    <input type="submit" name="submit" value="Submit" class="btn btn-primary">
                </div>
            </form>

		</div>
            <?php $this->load->view('gy/footer');?>
            <script>
                var romanize_reset = function(lang){
                    return function() {
                        let text = $("#lang\\[" + lang + "\\]").val();
                        $("#romanize\\[" + lang + "\\]").val("Loading...");
                        $.ajax(currpath + "admin/romanize_api", {
                            method: "post", data: {
                                lang: lang,
                                text: text
                            }
                        }).done(function (result) {
                            $("#romanize\\[" + lang + "\\]").val(result);
                        });
                    };
                };
                $("#romanize_reset_ja").on("click", romanize_reset("ja"));
                $("#romanize_reset_zh").on("click", romanize_reset("zh"));
            </script>

	</div>
</body>
</html>