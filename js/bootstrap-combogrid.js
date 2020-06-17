/**
 * jquery功能扩展
 */
$.fn.extend({
    comboGrid : function(option){
    	if(this.length == 0) return;
    	option.$el = this;
    	option.id = option.id ? option.id : 
    		(this.attr("id") ? this.attr("id") : Math.round(Math.random()*100000));
    	var grid = new __comboGrid(option);
    	var proto = this.constructor.prototype;
		if(!proto.innerMap){
			proto.innerMap = {};
		}
		this.attr("innerId", grid.id);
		proto.innerMap[this.selector] = grid;
		this.constructor.prototype.getComboGrid = function(){
			var selector = this.attr("innerId");
			var grid = this.constructor.prototype.innerMap[selector];
			return grid;
		};
		return this;
    },
})

/**
 * comboGrid对象
 */
var __comboGrid = function(option){
	//内部方法：像素转数字
	this.px2Num = function(px){
    	if(px && px.indexOf("px") > 0){
    		return Number(px.substring(0,px.indexOf("px")));
    	}
    	return Number(px);
    },
    //内部方法：计算数组长度
    this.countArr = function(arr){
    	var i = 0;
    	for(var j in arr){
    		i++;
    	}
    	return i;
    }
	if(this.countArr(option.colNames) != this.countArr(option.colModel)){
		throw "colNames和colModel长度不一致!";
	}
	this.id = "combogrid-"+option.id;
	if($("#"+this.id).length > 0){
		$("#"+this.id).remove();
	}
	this.trs = "";
	var ths = "";
	if(option.rowsnumber){
		ths = "<th class='combogrid-row-index'>序号</th>"; //这一列默认作为行序号显示
	}
	for(var i=0; i<option.colNames.length; i++){
		var hidden = option.colModel[i].hidden;
		ths += "<th style='width:"+option.colModel[i].width+(hidden ? ";display:none" : "")+"'>" + option.colNames[i] + "</th>";
	}
	var html = "<div class='combogrid-div'>" +
		"<table class='combogrid-table'>" +
		    "<thead>" + 
		        "<tr>" + ths + "</tr>" +
		    "</thead>" +
		    "<tbody></tbody>" +
		"</table>" +
	"</div>";
	var $el = this.$el = option.$el;
	var $html = $(html);
	$html.attr("id", this.id);
	//当前行序号
	this.currentRowIndex = -1;
	//显示下拉列表
	this.show = function(){
		if($("body").find("#"+this.id).length == 0){
			$html.appendTo($("body"));
            if(option.popWidth) {
                $html.width(option.popWidth);
            }
		}
		var height = $el.height() + this.px2Num($el.css("padding-top")) + this.px2Num($el.css("padding-bottom")) + 2;
		var offset = $el.offset();
		var left = offset.left;
		var top = offset.top + height;
		top = (offset.top + $html.height() > window.innerHeight) ? (offset.top - $html.height() - height + 10) : top;
		$html.css({display:"block", position: "absolute", top:top, left:-2000, "z-index":"999999"});  
		if(offset.left + $html.width() > $(window).width()){
			left = $(window).width() - $html.width();
			left = left < 0 ? 0 : left;
		}
		$html.css({left:left});
	};
	//隐藏列表
	this.hide = function(){
		$html.css({display:"none"});
		if(this.loading){
			this.loading.remove();
			this.loading = null;
		}
	};
	//列表是否可见
	this.visible = function(){
		var display = $html.css("display");
		return "none" == display ? false : true;
	};
	//行数
	this.length = function(){
		return $html.find(".combogrid-table tbody tr").length;
	};
	//定位下一行
	this.nextLine = function(reverse){
		var length = this.length();
		//反向
		if(reverse){
			if(this.currentRowIndex > 0){
				this.currentRowIndex--;
			}else{
				this.currentRowIndex = length - 1;
			}
		}
		else{
			if(this.currentRowIndex < length - 1){
				this.currentRowIndex++;
			}else{
				this.currentRowIndex = 0;
			}
		}
		$html.find(".combogrid-table tbody tr td").removeClass("combogrid-table-row-hover");
		$html.find(".combogrid-table tbody tr:eq("+this.currentRowIndex+") td").addClass("combogrid-table-row-hover");
	};
	//根据序号获取行数据
	this.getRowData = function(index){
		var row = {};
		var $tr = $html.find(".combogrid-table tbody tr:eq("+index+")");
		if($tr.length == 0) return row;
		var $tds = $tr.find("td");
		for(var i = 0; i < $tds.length; i++){
			var $td = $($tds[i]);
			var name = $td.attr("name");
			var value = $td.html();
			row[name] = value;
		}
		return row;
	};
	//指向列表对象
	var comboGrid = this;
	var keydownEvent = function(){
		var key = event.keyCode;
		//回车键
		if(key == 13){
			comboGrid.setCurrentRowToCtl();
			comboGrid.hide();
		}
		//ESC键
		else if(key == 27){
			comboGrid.hide();
			return;
		}
		//向左方向键
		else if(key == 37){
			if(comboGrid.gridpager){
				comboGrid.gridpager.nextPage(true);
			}
			return;
		}
		//向右方向键
		else if(key == 39){
			if(comboGrid.gridpager){
				comboGrid.gridpager.nextPage();
			}
			return;
		}
		//向上方向键
		else if(key == 38){
			if(comboGrid.visible()){
				comboGrid.show();
				comboGrid.nextLine(true);
			}
			return;
		}
		//向下方向键
		else if(key == 40){
			if(comboGrid.visible()){
				comboGrid.show();
				comboGrid.nextLine();
			}
			return;
		}
		//数字键 || 字母键 || 空格键 || backspace 有效 
		var effect = (key >=48 && key <= 57) || (key >=65 && key <= 90) || key == 32 || key == 8;
		if(!effect) return;
		if(comboGrid.readyToQuery){
			clearTimeout(comboGrid.readyToQuery);
		}
		
		if("post" == option.method || "get" == option.method){
			comboGrid.readyToQuery = setTimeout(function() {
				if($el.val() == "") return;
				option["searchTerm"] = $el.val();
				comboGrid.ajax(option);    		
			}, 300);	
		}else if("local" == option.method){
			comboGrid.searchInLocal();
		}
	};
	
	this.searchInLocal = function(){
		if(option.jsonData){
			var tempJsonList = [];
			for(var i=0;i<option.jsonData.length;i++){
				var item = option.jsonData[i];
				if(!$el.val()) return;
				if(option.searchTerm){
					if(item[option.searchTerm].indexOf($el.val()) < 0) continue;
				}else{
					if(item[option.displayMember].indexOf($el.val()) < 0) continue;
				}
				tempJsonList.push(item);
			}
			comboGrid.currentRowIndex = -1;
			comboGrid.trs = "";
			comboGrid.addRows(tempJsonList);
			comboGrid.show();
		}
	}
	
	if($el[0].tagName == "INPUT"){
		//输入框键盘事件
		$el.unbind("keydown.a");
		$el.bind("keydown.a", keydownEvent);
	}else if($el[0].tagName == "BUTTON"){
		$el.unbind("click.a");
		$el.bind("click.a", function(){
			if(comboGrid.readyToQuery){
				clearTimeout(comboGrid.readyToQuery);
			}
			if("post" == option.method || "get" == option.method){
				comboGrid.readyToQuery = setTimeout(function() {
					comboGrid.ajax(option);    		
				}, 300);	
			}else if("local" == option.method){
				comboGrid.searchInLocal();
			}
			return false;
		});
	}
	
	//支持中文输入查询
	if(option.supportChinese){
		$el.off('input propertychange');
		$el.on('input propertychange',function(){
			if(comboGrid.readyToQuery){
				clearTimeout(comboGrid.readyToQuery);
			}
			if("post" == option.method || "get" == option.method){
				comboGrid.readyToQuery = setTimeout(function() {
					if($el.val() == "") return;
					option["searchTerm"] = $el.val();
					comboGrid.ajax(option);    		
				}, 600);	
			}else if("local" == option.method){
				comboGrid.searchInLocal();
			}
		});
	}
	//提交请求
	this.ajax = function(option){
		var loading = new __comboLoading();
		this.loading = loading;
		
		$("body").append(loading.$html);
		loading.locate($el);
		
		var url = option.url;
		if(option.pager){
			var noteFirst = url.indexOf("?") > 0 ? "&&" : "?";
            var note = '&&';
			var rows = option.rows ? option.rows : 10;
			var page = option.page ? option.page : 1;
			var searchTerm = option.searchTerm ? option.searchTerm : "";
			var postdata = {};
			if(option.method == "get"){
				url += noteFirst + "rows=" + rows + note + "page=" + page + note + "searchTerm=" + searchTerm;
			}else{
				postdata = {"rows":rows, "page":page, "searchTerm":searchTerm};
				if(option.postData){
					var pd = JSON.stringify(option.postData).replace("[searchTerm]", searchTerm);
					pd = JSON.parse(pd);
					postdata = $.extend(postdata, pd);
				}
			}
		}
		$.ajax({
			data : postdata,
			type : option.method,
			url : url,
			dataType : "json",
			success : function(data) {
				if(comboGrid.afterLoadBeforeShow){
					comboGrid.afterLoadBeforeShow(data.gridResult?data.gridResult:data);
				}
				comboGrid.currentRowIndex = -1;
				comboGrid.trs = "";
				if(option.pager){
					var gridResult = data.gridResult;
					comboGrid.addRows(gridResult);
					comboGrid.addPager(data);
				}else{
					comboGrid.addRows(data);
				}
				loading.remove();
				comboGrid.show();
				if(comboGrid.complete){
					comboGrid.complete(data);
				}
			},
			error : function(){
				loading.remove();
			}
		});
	};
	//将当前行数据赋值给对应控件
	this.setCurrentRowToCtl = function(){
		if(this.length() == 0){
			return;
		}else if(this.currentRowIndex < 0 ){
			this.currentRowIndex = 0;
		}
		var row = this.getRowData(this.currentRowIndex);
		//显示值
		if(option.displayMember && row[option.displayMember]){
			$el.val(row[option.displayMember]);
		}
		//隐藏值
		if(option.valueMember && row[option.valueMember]){
			$el.attr("hiddenVal", row[option.valueMember]);
		}
		if(comboGrid.selectedRow){
			var item = this.items ? this.items[this.currentRowIndex] : {};
			comboGrid.selectedRow(row, item);
		}
	};
	//增加多行
	this.addRows = function(data){
		if(this.trs == null || this.trs == undefined){
			this.trs = "";
		}
		//暂存查询到的所有数据
		this.items = {};
		for(var i=0; i<data.length; i++){
			this.items[i] = data[i];
			var tr = "<tr rowIndex=" + i + ">";
			var odd = (i%2 == 1);
			if(option.rowsnumber){
				tr += "<td " + (odd ? "class='combogrid-table-row-even'" : "") + ">"+(Number(i)+1)+"</td>"
			}
			for(var j=0; j<option.colModel.length; j++){
				var name = option.colModel[j].name;
				var hidden = option.colModel[j].hidden;
				var value = data[i][name];
				
				var s = option.colStyle ? ("style='" + option.colStyle(name, value, data[i]) + "' ") : "";
				
				if(option.colModel[j].format){
					value = option.colModel[j].format(data[i]);
				}
				
				tr += "<td name='"+name+"' " + (odd ? "class='combogrid-table-row-even'" : "") + (hidden ? " style='display:none' " : s) + ">" + value + "</td>";
			}
			tr += "</tr>";
			this.trs += tr;
		}
		$html.find(".combogrid-table tbody").html(this.trs);
		$html.find(".combogrid-table tbody tr").hover(function(){
			comboGrid.mustShow = true;
			$html.find("tbody tr td").removeClass("combogrid-table-row-hover");
			var $tr = $(event.target).parent();
			comboGrid.currentRowIndex = $tr.attr("rowIndex");
			$tr.find("td").addClass("combogrid-table-row-hover");
		},function(){
			comboGrid.mustShow = false;
		});
		$html.find(".combogrid-table tbody tr").click(function(){
			var $tr = $(event.target).parent();
			comboGrid.currentRowIndex = $tr.attr("rowIndex");
			comboGrid.setCurrentRowToCtl();
			comboGrid.mustShow = false;
			comboGrid.hide();
		});
	};
	//添加分页
	this.addPager = function(param){
		var pager = new __gridPager({
			id : option.id,
			total : param.total,
			page : param.page,
			records : param.records
		});
		this.gridpager = pager;
		$html.find("#"+pager.id).remove();
		$html.append(pager.$html);
		pager.enter = function(){
			comboGrid.mustShow = true;
		};
		pager.leave = function(){
			comboGrid.mustShow = false;
		};
		pager.findPage = function(param){
			comboGrid.ajax({
				method: option.method,
			    url: option.url,
			    page: param.page,
			    rows: option.rows,
			    searchTerm:option.searchTerm,
			    postData:option.postData,
			    pager: option.pager
			});
		};
	};
	//加载完成事件
	this.complete = option.complete;
	//加载完成后显示之前事件
	this.afterLoadBeforeShow = option.afterLoadBeforeShow;
	//单选行事件
	this.selectedRow = option.selectedRow;
	//事件集合
	this.evtCol = {};
	//增加全局点击事件
	this.addGlobalClick = function(id, func){
		if(this.evtCol[id]) return;
		this.evtCol[id] = func;
		$(document).click(function(){
			for(var i in comboGrid.evtCol){
				comboGrid.evtCol[i]();
			}
		});
	};
	this.addGlobalClick(this.id, function(){
		if(comboGrid.visible() && !comboGrid.mustShow){
			comboGrid.hide();
		}
	});
    //插入HTML
    this.insertHTML = function(html){
    	var $ih = $html.find("div[name='combogrid-insert-html']");
    	if($ih.length == 0){
    		$ih = $("<div name='combogrid-insert-html'></div>");
    		$html.prepend($ih);
    	}
    	$ih.html(html);
    };
};

//分页组件
var __gridPager = function(option){
	this.id = "pg_pager_" + option.id;
	this.page = Number(option.page);
	this.total = Number(option.total);
	
	var firstId = "first_page_"+option.id;
	var prevId = "prev_page_"+option.id;
	var nextId = "next_page_"+option.id;
	var lastId = "last_page_"+option.id;
	var pager = this;
	
    this.html = '<div id="' + this.id + '" class="grid-pager-control" role="group">' +
       '<table style="width:100%">' +
        '<tbody>' +
         '<tr>' +
          '<td align="center">' +
              '<div>' +
	          '<span id="'+firstId+'" class="glyphicon glyphicon-step-backward ui-disabled" title="第1页" style="cursor:default;"></span>&nbsp' +
	          '<span id="'+prevId+'" class="glyphicon glyphicon-backward ui-disabled" title="前1页" style="cursor:default;"></span>&nbsp' +
	          '<span>当前页&nbsp<input id="page_input_'+option.id+'"style="height:20px;width:30px;" type="text" maxlength="7" value="'+option.page+'" />&nbsp/&nbsp'+option.total+'</span>&nbsp' +
	          '<span id="'+nextId+'" class="glyphicon glyphicon-forward ui-disabled" title="后1页" style="cursor:default;"></span>&nbsp' +
	          '<span id="'+lastId+'" class="glyphicon glyphicon-step-forward ui-disabled" title="最后1页" style="cursor:default;"></span>' +
	          '</div>' +
          '</td>' +
         '</tr>' +
        '</tbody>' +
       '</table>' + 
	  '</div>';
    this.$html = $(this.html);
    
    if(this.total > 1){
    	this.$html.find("#"+nextId+",#"+lastId).removeClass("ui-disabled");
    }
    
    if(this.page > 1){
    	pager.$html.find("#"+firstId+",#"+prevId).removeClass("ui-disabled");
    }else{
    	pager.$html.find("#"+firstId+",#"+prevId).addClass("ui-disabled");
    }
    
    this.enter = null;
    this.leave = null;
    this.findPage = null;
    
    this.$html.find("#"+firstId+",#"+prevId+",#"+nextId+",#"+lastId).click(function(){
        if(pager.total == 0) return;
        var $target = $(this);
        if($target.attr("id") == firstId){
        	pager.page = 1;
        }else if($target.attr("id") == prevId){
        	pager.page -= 1;
        	pager.page = pager.page < 0 ? 1 : pager.page;
        }else if($target.attr("id") == nextId){
        	pager.page += 1;
        	pager.page = pager.page > pager.total ? pager.total : pager.page;
        }else if($target.attr("id") == lastId){
        	pager.page = pager.total;
        }
        
        if(pager.page > 1){
        	pager.$html.find("#"+firstId+",#"+prevId).removeClass("ui-disabled");
        }else{
        	pager.$html.find("#"+firstId+",#"+prevId).addClass("ui-disabled");
        }
        
    	if(pager.findPage){
    		pager.findPage({page:pager.page});
    	}
    });
    this.$html.find("#page_input_"+option.id).keydown(function(){
    	var $el = $(event.target);
    	//回车键
    	if(event.keyCode == 13){
    		if(pager.findPage){
        		pager.findPage({page:$el.val()});
        	}
    	}
    });
    this.$html.find("tbody span").hover(function(){
		if(pager.enter){
			pager.enter();
		}
	},function(){
		if(pager.leave){
			pager.leave();
		}
	});
    this.nextPage = function(reverse){
		if(reverse){
			this.$html.find("#"+prevId).click();
		}else{
			this.$html.find("#"+nextId).click();
		}
	};
};
//加载动画
var __comboLoading = function(){
	this.$html = $('<div class="combogrid-loading" style="position:absolute;z-index:9999;">' +
			        '<div class="sk-spinner sk-spinner-fading-circle">' +
				    '<div class="sk-circle1 sk-circle"></div>' +
				    '<div class="sk-circle2 sk-circle"></div>' +
				    '<div class="sk-circle3 sk-circle"></div>' +
				    '<div class="sk-circle4 sk-circle"></div>' +
				    '<div class="sk-circle5 sk-circle"></div>' +
				    '<div class="sk-circle6 sk-circle"></div>' +
				    '<div class="sk-circle7 sk-circle"></div>' +
				    '<div class="sk-circle8 sk-circle"></div>' +
				    '<div class="sk-circle9 sk-circle"></div>' +
				    '<div class="sk-circle10 sk-circle"></div>' +
				    '<div class="sk-circle11 sk-circle"></div>' +
				    '<div class="sk-circle12 sk-circle"></div>' +
				  '</div></div>');
	this.locate = function($el){
		var offset = $el.offset();
		var paddingWidth = this.px2Num($el.css("padding-left")) + this.px2Num($el.css("padding-right"));
		var paddingHeight = this.px2Num($el.css("padding-top")) + this.px2Num($el.css("padding-bottom"))
		var left = offset.left + $el.width() + paddingWidth - this.$html.width() - 2;
		var top = offset.top + 4;
		var height = paddingHeight + $el.height() - 4;
		var width = height;
		
		this.$html.css({left: left, top: top, width: width, height: height});
	};
	this.remove = function(){
		$("body").find(".combogrid-loading").remove();
	};
	//内部方法：像素转数字
	this.px2Num = function(px){
    	if(px && px.indexOf("px") > 0){
    		return Number(px.substring(0,px.indexOf("px")));
    	}
    	return Number(px);
    };
}
