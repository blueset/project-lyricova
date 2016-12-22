<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Category - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
    <style>
        .card-wrapper {
            height: 70vh;
            display: flex;
            flex-direction: column;
        }

        .cate-lrc-card {
            width: 100%;
            flex-grow: 1;
            margin: 0 0 2em 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 15px rgba(0,0,0,0.2);
            padding: 1em;
            display: flex;
            flex-direction: column;
        }

        .cate-lrc-lyrics {
            font-size: 1.5em;
            border-bottom: 1px solid rgba(0,0,0,.2);
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            flex-grow: 1;
            overflow: hidden;
        }

        .cate-lrc-meta {
            font-style: italic;
            color: rgba(0,0,0,0.5);
        }

        .cate-lrc-meta small {
            font-size: 0.75em;
        }

        .cate-buttons {
            display: flex;
            flex-direction: row;
            align-items: center;
        }

        .cate-cates {
            flex-grow: 7;
        }

        .cate-btn {
            flex-grow: 1;
            text-align: center;
            font-weight: bold;
            padding: 2rem .5rem;
            border: 1px solid;
            border-radius: 5px;
            margin: 0.5rem;
            font-size: 1.5em;
        }

        .cate-row {
            display: flex;
            flex-direction: row;
        }

        .cate-prev, .cate-next {
            height: 15rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        div[data-toggle="1"]{
            color: white;
        }

        .cate-btn-core{color: #757575; border-color: #757575;} .cate-btn-core[data-toggle="1"]{background-color: #757575;}
        .cate-btn-dark{color: #5C6BC0; border-color: #5C6BC0;} .cate-btn-dark[data-toggle="1"]{background-color: #5C6BC0;}
        .cate-btn-soft{color: #29B6F6; border-color: #29B6F6;} .cate-btn-soft[data-toggle="1"]{background-color: #29B6F6;}
        .cate-btn-light{color: #BA68C8; border-color: #BA68C8;} .cate-btn-light[data-toggle="1"]{background-color: #BA68C8;}
        .cate-btn-vivid{color: #7CB342; border-color: #7CB342;} .cate-btn-vivid[data-toggle="1"]{background-color: #7CB342;}
        .cate-btn-sweet{color: #F06292; border-color: #F06292;} .cate-btn-sweet[data-toggle="1"]{background-color: #F06292;}
        .cate-btn-solid{color: #607D8B; border-color: #607D8B;} .cate-btn-solid[data-toggle="1"]{background-color: #607D8B;}
    </style>
    <div id="wrapper">
		<?php $this->load->view('admin/header');?>
		<div class="jumbotron header single-head admin-jumbotron">
			<div class="page-wrapper">
				<h2>Category <small>Category roller www</small></h2>
			</div>
		</div>
		<div id="page-wrapper">
			<div class="card-wrapper">
                <div class="cate-lrc-card">
                    <div class="cate-lrc-lyrics">
                        メーデー　僕を暴いてよ <br>
                        最初からイナイと理解ってた？
                    </div>
                    <div class="cate-lrc-meta">
                        <span class="cate-lrc-name">ゴーストルール</span><br>
                        <small class="cate-lrc-author">DECO*27 feat. 初音ミク</small>
                    </div>
                </div>
                <div class="cate-buttons">
                    <div class="cate-btn cate-prev">&Lt;</div>
                    <div class="cate-cates">
                        <div class="cate-row">
                            <div class="cate-btn cate-btn-core" data-cat="core">CORE</div>
                            <div class="cate-btn cate-btn-dark" data-cat="dark">DARK</div>
                            <div class="cate-btn cate-btn-soft" data-cat="soft">SOFT</div>
                        </div>
                        <div class="cate-row">
                            <div class="cate-btn cate-btn-light" data-cat="light">LIGHT</div>
                            <div class="cate-btn cate-btn-vivid" data-cat="vivid">VIVID</div>
                            <div class="cate-btn cate-btn-sweet" data-cat="sweet">SWEET</div>
                            <div class="cate-btn cate-btn-solid" data-cat="solid">SOLID</div>
                        </div>
                    </div>
                    <div class="cate-btn cate-next">&Gt;</div>
                </div>
            </div>
		</div>
		<?php $this->load->view('gy/footer');?>
        <script>
            var base_url = "<?=site_url('admin/category_api')?>/";
            var cates = ["core", "dark", "soft", "light", "vivid", "sweet", "solid"];
            var elem = document.getElementsByClassName("card-wrapper")[0];
            for (var i of cates){
                var cate_btn = elem.getElementsByClassName("cate-btn-" + i)[0];
                cate_btn.addEventListener("click", function(){
                    toggle_class.bind(this)(i);
                }.bind(cate_btn));
            }
            var prevnext = function(){
                if (this.dataset.id) {
                    elem.getElementsByClassName("cate-lrc-lyrics")[0].innerHTML = "Loading...";
                    elem.getElementsByClassName("cate-lrc-name")[0].innerText = "Loading...";
                    elem.getElementsByClassName("cate-lrc-author")[0].innerText = "Loading...";
                    update(this.dataset.id);
                }
            };
            elem.getElementsByClassName("cate-prev")[0].addEventListener("click", prevnext.bind(elem.getElementsByClassName("cate-prev")[0]));
            elem.getElementsByClassName("cate-next")[0].addEventListener("click", prevnext.bind(elem.getElementsByClassName("cate-next")[0]));

            var update = function(id){
                var xhr = new XMLHttpRequest();
                xhr.open('GET', base_url + id);
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        var data = JSON.parse(xhr.responseText);
                        elem.getElementsByClassName("cate-lrc-lyrics")[0].innerHTML = data.lyrics.replace(/\n/g, "<br>");
                        elem.getElementsByClassName("cate-lrc-name")[0].innerText = data.name;
                        elem.getElementsByClassName("cate-lrc-author")[0].innerText = data.artist;
                        id = parseInt(data.id);
                        window.location.hash = "#" + id;
                        for (var i of cates){
                            var cate_btn = elem.getElementsByClassName("cate-btn-" + i)[0];
                            if (data.category.indexOf(i) >= 0){
                                cate_btn.dataset.toggle = 1;
                            } else {
                                cate_btn.dataset.toggle = 0;
                            }
                            cate_btn.dataset.id = id;
                        }
                        elem.getElementsByClassName("cate-prev")[0].dataset.id = data.prev;
                        elem.getElementsByClassName("cate-next")[0].dataset.id = data.next;
                    }
                };
                xhr.send();
            };

            var toggle_class = function(){
                console.log(this);
                this.dataset.toggle = this.dataset.toggle === "1" ? 0 : 1;
                var cats = [];
                for (var i of cates){
                    var cate_btn = elem.getElementsByClassName("cate-btn-" + i)[0];
                    if (cate_btn.dataset.toggle == 1){
                        cats.push(i);
                    }
                }
                xhr = new XMLHttpRequest();

                xhr.open('POST', base_url + this.dataset.id);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        console.log("Success");
                    }
                };
                xhr.send(encodeURI('data=' + JSON.stringify(cats)));
            };
            if (window.location.hash && parseInt(window.location.hash.substring(1))){
                update(parseInt(window.location.hash.substring(1)));
            } else update(0);
        </script>
    </div>
</body>
</html>