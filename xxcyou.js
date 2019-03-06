function Sfou(patho) {
	var cc = confirm("是否解析视频?");
	if (cc == true)
	{ location.href = "http://api.ledboke.com/vip/?url=" + patho;}
}
window.onload = function() {/*加载完毕*/
	var path = location.href;
	if (path.indexOf("m.iqiyi.com") != -1 && path.indexOf(".html") != -1 && path.indexOf("api.ledboke.com") == -1)//爱奇艺
	{
		Sfou(path);
	}
	if (path.indexOf("m.le.com") != -1 && path.indexOf(".html") != -1 && path.indexOf("api.ledboke.com") == -1)//乐视
	{
		Sfou(path);
	}
	if (path.indexOf("m.v.qq.com") != -1 && path.indexOf("play.html") != -1 && path.indexOf("api.ledboke.com") == -1)//腾讯视频
	{
		Sfou(path);
	}
	if (path.indexOf("m.youku.com") != -1 && path.indexOf(".html") != -1 && path.indexOf("api.ledboke.com") == -1)//优酷
	{
		Sfou(path);
	}
};