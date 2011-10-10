function build_ledger(ledger, csv_url) {
  success = function(data) {
    var transactions = $.csv()(data);
    txheader = {};
    $.each(transactions.shift(), function(i) { txheader[this.replace(" ", "_")] = i; });

    histogram = {
      payments_rx_count_dow: {},
      payments_rx_net_dow: {}
    }
    buckets = {};
    add_to_total = function(total, t, g, f, n) {
      if($.isEmptyObject(total[t])) {
        total[t] = {
          count:  0,
          gross:  0,
          fee:    0,
          net:    0
        }
      }
      total[t].count += 1;
      total[t].gross += g;
      total[t].fee   += f;
      total[t].net   += n;
    }
    total_to_array = function(total) {
      var a = [];
      var t = 0;
      $.each(["Payment Received", "Payment Sent", "Refund"], function() {
        var b = [[0, this + " count"], [0, this + " gross"], [0, this + " fee"], [0, this + " net"]];
        if(!$.isEmptyObject(total[this])) {
          b[0][0] = total[this].count;
          b[1][0] = total[this].gross.toFixed(2);
          b[2][0] = total[this].fee.toFixed(2);
          b[3][0] = total[this].net.toFixed(2);
          t += total[this].net;
        }
        a.push.apply(a, b);
      });
      a.push([t.toFixed(2), "total"]);
      return a;
    }
    $.each(transactions, function(i) {
      var date  = this[txheader.Date].split("/");
      var y = date[0]; var m = date[1]; var d = date[2];

      var gross = parseFloat(this[txheader.Gross]);
      var fee   = parseFloat(this[txheader.Fee]);
      var net   = parseFloat(this[txheader.Net]);
      var type  = this[txheader.Type];
      if(type == "Payment Received") {
        var ddate = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
        var dow = ddate.getDay();
        if(!(dow in histogram.payments_rx_count_dow))
          histogram.payments_rx_count_dow[dow] = 0;
        histogram.payments_rx_count_dow[dow] += 1;

        if(!(dow in histogram.payments_rx_net_dow))
          histogram.payments_rx_net_dow[dow] = 0;
        histogram.payments_rx_net_dow[dow] += net;
      }
      var arr   = [this[txheader.From], type, gross, fee, net];
      if(!(y in buckets)) 
        buckets[y] = {total:{}, children:{}};
      if(!(m in buckets[y].children)) 
        buckets[y].children[m] = {total:{}, children:{}};
      if(!(d in buckets[y].children[m].children)) 
        buckets[y].children[m].children[d] = {total:{}, children:[]};
      buckets[y].children[m].children[d].children.push(arr);
      $.each([buckets[y].total, 
              buckets[y].children[m].total, 
              buckets[y].children[m].children[d].total],
      function() {
        add_to_total(this, type, gross, fee, net);
      });
    });

    toggle_next_div = function() { 
      $(this.parentNode).nextAll("div").first().slideToggle(1000);
    };

    create_header = function(klass, html, total) {
      header = $("<ul>");
      header.append($("<li>").addClass("header").addClass(klass).html($("<span>").html(html)));
      $.each(total_to_array(total), function() {
        var span = $("<span>").html(this[0].toString());
        var li = $("<li>").addClass(this[1].toString()).html(span);
        header.append(li);
      });
      return header;
    };

    aoColumns = $.map(["From", "Type", "Gross", "Fee", "Net"], function(m) { return { "sTitle" : m }; });

    $.each(buckets, function(y, yv) {
      yheader = create_header("year", y, yv.total);
      $(".header", yheader).click(toggle_next_div);
      ycontent = $("<div>").addClass("year").addClass("c"+y);
      container = $("<div>").append(yheader, ycontent);
      ledger.append(container, $("<div>"));

      $.each(buckets[y].children, function(m, mv) {
        mheader = create_header("month", y+"-"+m, mv.total);
        mcontent = $("<div>").addClass("month").addClass("c"+y+"_"+m).hide();

        container = $("<div>").append(mheader, mcontent);
        ycontent.append(container, $("<div>"));

        $(".header", mheader).click(toggle_next_div);

        $.each(buckets[y].children[m].children, function(d, dv) {
          dheader = create_header("day", y+"-"+m+"-"+d, dv.total);
          $(".header", dheader).click(toggle_next_div);
          dcontent = $("<div>").addClass("day").hide();
          container = $("<div>").append(dheader, dcontent);
          mcontent.append(container, $("<div>"));

          dcontent.append($('<table width="1000px" cellpadding="0" cellspacing="0" border="0"></table>'));
          $("table", dcontent).dataTable({
            "bInfo"     : false,
            "bFilter"   : false,
            "bPaginate" : false,
            "aaData"    : this.children,
            "aoColumns" : aoColumns
          });
        });
      });
    });
  }
  $.ajax({ dataType: "text", url: csv_url, success: success });
}
