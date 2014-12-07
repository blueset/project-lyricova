<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit signature picture - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>

</head>
<body>
<!-- TODO: remove this -->
<script src="<?=base_url('js/jquery-1.7.2.min.js');?>"></script>
	<div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Edit signature <?php echo(($id != -1)?"of ".$id:""); ?></h2>
			</div>
		</div>
		<div id="page-wrapper">
            <?php 
                if (!isset($errormsg)) {$errormsg = "";}
                $errormsg .= validation_errors();
                if ($errormsg != ''):?>
                    <div class="alert alert-danger">
                        <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
                        <strong>Error: </strong> <?=$errormsg;?> 
                    </div>
            <?php endif; ?>
            
			<div class="row-fluid">
				<?php if(@$success==true){ ?>
                <div class="alert alert-success fade in ">
                    <a href="#" class="close" data-dismiss="alert">&times;</a>
                    <strong>Success!</strong> Edited.
                </div>
                <?php }?>
                <!--/** So, how should a signature customiser have?
                 *
                 * preview
                 * bg-image uploader.
                 * - change name and replace.
                 * Font select
                 * all the parameters
                 * - text region: x/y offset, width, height
                 * - position number: 1/2/3/4/5/6/7/8/9
                 * - min size, max size, default size, line height (float)
                 * - color
                 * - alignment
                 * - meta size, height (float)
                 * - address?
                 *
                 */ -->
                <div id="signature-preview">
                    <canvas id="preview" width="600" height="300"></canvas>
                </div>
                <?php echo form_open_multipart('admin/signature',array('class'=>'form-horizontal','id'=>"form")); ?>
                    <div class="form-group">
                        <label for="file" class="col-sm-2 control-label">Background</label>
                        <div class="input-group col-sm-10">
                            <span class="input-group-btn"><span class="btn btn-default btn-file">Select file <input type="file" name="bgimg" accept=".png" size="20" onchange="readURL(this);" /></span></span>
                            <input type="text" id="file-path" class="form-control" placeholder="Only PNG file is supported. Only upload if you want to change." readonly>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="font" class="col-sm-2 control-label">Font</label>
                        <div class="input-group col-sm-10">
                            <select class="form-control" name="font" id="font">
                                <?php foreach ($fonts as $font):?>
                                <?='<option value="'.$font->name.'">'.$font->caption."</option>"?>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <p>
                        <h3>Text area</h3>
                    </p>
                    <div class="row">
                        <div class="col-sm-3">
                            <label for="x-offset" class="control-label">X-offset</label>
                            <input type="number" min="0" max="100" step="1" class="form-control" name="x-offset">
                        </div>
                        <div class="col-sm-3"><label for="y-offset" class="control-label">Y-offset</label><input type="number" class="form-control" name="y-offset" min="0" max="100" step="1"></div>
                        <div class="col-sm-3"><label for="width" class="control-label">Width</label><input type="number" class="form-control" name="width" min="0" max="100" step="1"></div>
                        <div class="col-sm-3"><label for="height" class="control-label">Height</label><input type="number" class="form-control" name="height" min="0" max="100" step="1"></div>
                        


                    </div>
                    <p>
                        <h3>Font setting</h3>
                    </p>
                    <div class="row">
                        <div class="col-sm-3">
                            <label for="min-size" class="control-label">Minimum size</label>
                            <input type="number" min="0" max="100" step="1" class="form-control" name="min-size">
                        </div>
                        <div class="col-sm-3"><label for="max-size" class="control-label">Maximum size</label><input type="number" class="form-control" name="max-size" min="0" max="100" step="1"></div>
                        <div class="col-sm-3"><label for="default-size" class="control-label">Default size</label><input type="number" class="form-control" name="default-size" min="0" max="100" step="1"></div>
                        <div class="col-sm-3"><label for="line-height" class="control-label">Line height</label><input type="number" class="form-control" name="line-height" min="0" max="100" step="0.01"></div>
                    </div>
                    <div class="row">
                        <div class="col-sm-4">
                            <label for="position" class="control-label">Position</label>
                            <select type="number" min="0" max="100" step="1" class="form-control" name="position">
                                <option value="1">Top left</option>
                                <option value="2">Top center</option>
                                <option value="3">Top right</option>
                                <option value="4">Middle left</option>
                                <option value="5">Middle center</option>
                                <option value="6">Middle right</option>
                                <option value="7">Bottom left</option>
                                <option value="8">Bottom center</option>
                                <option value="9">Bottom right</option>
                            </select>
                        </div>
                        <div class="col-sm-4">
                            <label for="color" class="control-label">Text color</label>
                            <input type="color" class="form-control" name="color" min="0" max="100" step="1">
                        </div>
                        <div class="col-sm-4">
                            <label for="alignment" class="control-label">Alignment</label>
                            <select type="number" min="0" max="100" step="1" class="form-control" name="alignment">
                                <option value="l">Left</option>
                                <option value="c">Center</option>
                                <option value="r">Right</option>
                            </select>
                        </div>
                        
                    </div>
                    <div class="row">
                        <div class="col-sm-6">
                            <label for="meta-size" class="control-label">Title Size</label>
                            <input type="number" min="0" max="100" step="1" class="form-control" name="meta-size">
                        </div>
                        <div class="col-sm-6"><label for="meta-line-height" class="control-label">Title Line Height</label><input type="number" class="form-control" name="meta-line-height" min="0" max="100" step="0.01"></div>
                    </div>
                    <div class="row">
                        <div class="col-sm-12" style="margin-top: 10px">
                            <input type="submit" name="submit" class="btn btn-primary btn-block btn-lg" id="btn-submit" value="Submit" />
                        </div>
                    </div>
                </form>
		
		</div>
		<?php $this->load->view('gy/footer');?>
	</div>
<script src="<?=base_url('js/fabric.min.js');?>"></script>
<script type="text/javascript">
// last item of array
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};
var prevCanvas = new fabric.Canvas("preview");
fabric.Image.fromURL('<?=base_url('img/dyna-bg/'.$settings['bgimg'])?>',function(_img){
    prevCanvas.add(_img);
    bgimg = _img;
    updateRange();
    initPreview();
});

// default value
var x_offset = 160, y_offset = 40, boxWidth = 400, boxHeight = 250;
var size = 35, lineheight = 1.1,  metasize = 20, metalineh = 1.1;
errorStatus = 0;

// fill value from controller
x_offset = <?=$settings['x_offset']?>; $('input[name=x-offset]')[0].value = x_offset;
y_offset = <?=$settings['y_offset']?>; $('input[name=y-offset]')[0].value = y_offset;
boxWidth = <?=$settings['width']?>; $('input[name=width]')[0].value = boxWidth;
boxHeight = <?=$settings['height']?>; $('input[name=height]')[0].value = boxHeight;
size = <?=$settings['size']?>; $('input[name=default-size]')[0].value = size;
lineheight= <?=$settings['lineheight']?>; $('input[name=line-height]')[0].value = lineheight;
metasize = <?=$settings['metasize']?>; $('input[name=meta-size]')[0].value = metasize;
metalineh = <?=$settings['metalineh']?>; $('input[name=meta-line-height]')[0].value = metalineh;
$('input#file-path')[0].value = '<?=$settings['bgimg']?>';
font = ('<?=$settings['font']?>' == '') ? $('[name=font] option:first').val() : '<?=$settings['font']?>'; $('select[name=font]')[0].value = font;
position = '<?=$settings['position']?>'; $('select[name=position]')[0].value = position;
min_size = <?=$settings['min_size']?>; $('input[name=min-size]')[0].value = min_size;
max_size = <?=$settings['max_size']?>; $('input[name=max-size]')[0].value = max_size;
color = '<?=$settings['color']?>'; $('input[name=color]')[0].value = color;
align = '<?=$settings['align']?>'; $('select[name=alignment]')[0].value = align;

// write onchange event to inputs/selects

$('input').on('change',readValue);
$('select').on('change',readValue);

// main box
var mainBox = new fabric.Rect({
        left: x_offset, top: y_offset, 
        width: boxWidth, height: boxHeight,
        fill: 'rgba(255,0,0,0.2)'
    });
var boxArray = [];
// draw boxes
function initPreview(){
    mainBox.left = x_offset;
    mainBox.top = y_offset;
    mainBox.width = boxWidth;
    mainBox.height = boxHeight;
    prevCanvas.add(mainBox);
    hRemaining = boxHeight;
    _lineheight = parseInt(lineheight * size);
    _metalineh = parseInt(metalineh * metasize);

    while (hRemaining - _metalineh > _lineheight){
        boxArray.push(new fabric.Rect({left: x_offset, width: boxWidth,
                        height: size, top: y_offset + boxHeight - hRemaining,
                        fill: 'rgba(0,255,0,0.4)'}));
        prevCanvas.add(boxArray.last());
        hRemaining -= _lineheight;
    }
        boxArray.push(new fabric.Rect({left: x_offset, width: boxWidth,
                        height: metasize, top: y_offset + boxHeight - hRemaining + _metalineh - metasize, 
                        fill: 'rgba(0,0,255,0.4)'}));
    prevCanvas.add(boxArray.last());
}

function clearCanvas () {
    while(boxArray.length > 0){
        prevCanvas.remove(boxArray.shift());
    }
    prevCanvas.remove(mainBox);
}

function readValue () {
    boxWidth = parseInt($("input[name=width]")[0].value);
    boxHeight = parseInt($("input[name=height]")[0].value);
    _x_offset = parseInt($("input[name=x-offset]")[0].value);
    _y_offset = parseInt($("input[name=y-offset]")[0].value);
    size = parseInt($("input[name=default-size]")[0].value);
    lineheight = parseFloat($("input[name=line-height]")[0].value);
    metasize = parseInt($("input[name=meta-size]")[0].value);
    metalineh = parseFloat($("input[name=meta-line-height]")[0].value);
    _position = parseInt($("select[name=position]")[0].value);

    if (parseInt((_position - 1)/3) == 0) x_offset = _x_offset;
    if (parseInt((_position - 1)/3) == 1) x_offset = bgimg.width - parseInt(boxHeight / 2);
    if (parseInt((_position - 1)/3) == 2) x_offset = bgimg.width - boxHeight - _x_offset;

    if (_position % 3 == 1) y_offset = _y_offset;
    if (_position % 3 == 2) y_offset = bgimg.height - parseInt(boxWidth / 2);
    if (_position % 3 == 0) y_offset = bgimg.height - boxHeight - _y_offset;

    checkError();
    updateRange();
    clearCanvas();
    initPreview();

}

function checkError () {
    // xoff/yoff - exceed 
    
    if (x_offset > bgimg.width) returnError('x-offset',1); else returnError('x-offset',0);
    if (y_offset > bgimg.height) returnError('y-offset',1); else returnError('y-offset',0);

    // boxW/boxH - exceed
    
    if ((boxWidth + x_offset) > bgimg.width) returnError('width',1); else returnError('width',0);
    if ((boxHeight + y_offset) > bgimg.height) returnError('height',1); else returnError('height',0);

    // mainL - min 1.0
    
    if (lineheight < 1.0) returnError('line-height',1); else returnError('line-height',0);

    // metaL - min 1.0
     
    if (metalineh < 1.0) returnError('meta-line-height',1); else returnError('meta-line-height',0);

    // min/max/default - range
    
    if (max_size < size) returnError('max-size',1); else returnError('max-size',0);
    if (min_size > size) returnError('min-size',1); else returnError('min-size',0);

}
function updateRange () {
    
    $('[name=x-offset]').prop('max',bgimg.width);
    $('[name=y-offset]').prop('max',bgimg.height);
    $('[name=width]').prop('max',bgimg.width - $('[name=x-offset]').val());
    $('[name=height]').prop('max',bgimg.height - $('[name=y-offset]').val());
    $('[name=max-size]').prop('min',$('[name=min-size]').val());
    $('[name=min-size]').prop('max',$('[name=max-size]').val());
    $('[name=default-size]').prop('min',$('[name=min-size]').val()).prop('max',$('[name=max-size]').val());

}
function returnError (name, status) {
    if (status == 1){
        $('[name='+name+']').parents().addClass('has-error');
    }else{
        $('[name='+name+']').parents().removeClass('has-error');
    }
    $('#btn-submit').prop('disabled',$('div').hasClass('has-error'));

}

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
    $('.canvas-container').addClass('imggen-preview').css('margin', '15px auto');
    $('#form').submit(function (e) {
        
        if(!$('div').hasClass('has-error')){
            return true;
        }
        return false;
    })
});

function readURL(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
            
            fabric.Image.fromURL(e.target.result,function (_img) {
                prevCanvas.remove(bgimg);
                bgimg = _img;
                prevCanvas.add(bgimg);
                prevCanvas.setWidth(bgimg.width);
                prevCanvas.setHeight(bgimg.height);
                checkError();
                clearCanvas();
                initPreview();
            });

        };
        reader.readAsDataURL(input.files[0]);
    }
}

</script>

</body>
</html>