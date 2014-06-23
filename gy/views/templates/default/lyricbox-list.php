<?php
$lyricinline=strip_quotes($this->typography->nl2br_except_pre($postitem->lyric));
$own = $this->user_model->is_own($postitem->user_id);
?>
<div class="songbox-cont col-sm-6 col-md-4 col-xs-12" >
    <div class="song-box">
        <div class="lyric"><?=$this->typography->nl2br_except_pre($postitem->lyric)?></div>
        <div class="meta text-muted">
            <div class="infobuttons">
                <?=anchor('/post/'.$postitem->id, '<i class="fa fa-arrow-circle-right fa-large"></i>');?>
                <a data-toggle="collapse" class="infobutton" data-target="#detail-<?=$postitem->id?>" href="javascript:void(0)"> <i class="fa fa-chevron-circle-down fa-large"></i> </a>
            </div>
            <small>

                <span class="title" onclick="window.open('<?= site_url('/post/'.$postitem->id)?>')"><?=$postitem->name?></span> by <span class="author"><?=$postitem->artist?></span> <?php if(!$postitem->featuring=="") {?>feat. <span class="feat"><?=$postitem->featuring?></span> <?php } ?><?php if(!$postitem->album==""){ ?>in <span class="album"><?=$postitem->album?></span> <?php } ?>

            </small></div>
        <div id="detail-<?=$postitem->id?>" class="collapse">
            <hr class="songb-hr">
            <?php if(!$postitem->origin==""){ echo '<strong>Original Lyric:</strong> <br>'.$this->typography->nl2br_except_pre($postitem->origin).'<br>';} ?>
            <?php if(!$postitem->translate==""){ echo '<strong>Translated Lyric:</strong> <br>'.$this->typography->nl2br_except_pre($postitem->translate).'<br>';} ?>
            <?php if(!$postitem->translator==""){ echo '<strong>Translator:</strong> '.$postitem->translator.'<br>';} ?>
            <?php if(!$postitem->comment==""){ echo '<strong>Comment:</strong><br>'.$this->typography->nl2br_except_pre($postitem->comment).'<br>';} ?>
            <small class="text-muted songb-end-meta">
                Posted at <time><?=$postitem->time?></time> by <?=$this->user_model->get_by_id($postitem->user_id)->display_name?>.
                <?php if($this->user_model->access_to("edit".$own)===TRUE){ echo " | ".anchor('admin/edit/'.$postitem->id, 'Edit'); }?>
                <?php if($this->user_model->access_to("delete".$own)===TRUE){ echo " | ".'<a href="javascript:void(0)" onclick="delConfModal('.$postitem->id.",'".jsize_string(strip_quotes($postitem->lyric))."')\">Delete</a>"; }?>
            </small>
        </div>
    </div>
</div>