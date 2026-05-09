function exportExcel() {
    if (!projects.length) { showMsg('내보낼 프로젝트가 없습니다.'); return; }
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const dateFmt  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const esc = v => String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const mkCell = (v, sid) => `<Cell ss:StyleID="${sid}"><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const hdrCell = v => mkCell(v, 'xHdr');
    const cCell   = v => mkCell(v, 'xCtr');
    const lCell   = v => mkCell(v, 'xLft');

    // 컬럼 순서: No, 프로젝트명, 팀, 담당파트, 담당자, 의뢰부서, 개발시작, 개발종료, 총개발기간, D-Day, 적용예정일, 현재단계
    const colWidths = [35, 200, 90, 80, 65, 90, 75, 75, 70, 55, 80, 80];
    const colXml = colWidths.map(w => `<Column ss:Width="${w}"/>`).join('');
    const hdrLabels = ['No','프로젝트명','팀','담당파트','담당자','의뢰부서','개발시작','개발종료','총개발기간','D-Day','적용예정일','현재단계'];

    const dataRows = projects.slice().sort((a,b)=>new Date(a.open)-new Date(b.open)).map((p,i)=>{
        const { text: ddayTxt } = calcDDay(p.open, now);
        const { periodStart: fs, periodEnd: le, durStr } = calcDuration(p);
        const curPhase = calcCurPhase(p, now);
        return `<Row>${[
            cCell(i+1), lCell(p.name), cCell(p.team), cCell(p.part||''),
            cCell(p.pm), cCell(p.clientDept||''), cCell(fs), cCell(le),
            cCell(durStr), cCell(ddayTxt), cCell(p.open), cCell(curPhase)
        ].join('')}</Row>`;
    }).join('');

    const styles = `<Styles>
        <Style ss:ID="xHdr">
            <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
            <Interior ss:Color="#F46600" ss:Pattern="Solid"/>
            <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="0"/>
            <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#C95800"/></Borders>
        </Style>
        <Style ss:ID="xCtr">
            <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
            <Font ss:Size="9"/>
        </Style>
        <Style ss:ID="xLft">
            <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
            <Font ss:Size="9"/>
        </Style>
    </Styles>`;

    /* 인쇄 설정: A4 가로, 페이지 너비 맞춤, 헤더 행 반복, 머리글/바닥글 */
    const wsOptions = `<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <PageSetup>
            <Layout x:Orientation="Landscape"/>
            <Paper>9</Paper>
            <Header x:Margin="0.25" x:Data="&amp;L&amp;B여신IT개발부 SI프로젝트현황&amp;R출력일시: ${dateFmt}"/>
            <Footer x:Margin="0.25" x:Data="&amp;C- &amp;P / &amp;N -"/>
        </PageSetup>
        <Print>
            <ValidPrinterInfo/>
            <Orientation>Landscape</Orientation>
            <PaperSizeIndex>9</PaperSizeIndex>
            <TopMargin>0.5</TopMargin>
            <BottomMargin>0.5</BottomMargin>
            <LeftMargin>0.3</LeftMargin>
            <RightMargin>0.3</RightMargin>
            <FitWidth>1</FitWidth>
            <FitHeight>0</FitHeight>
            <RepeatAtTop>$1:$1</RepeatAtTop>
        </Print>
        <FitToPage/>
        <FreezePanes/>
        <SplitHorizontal>1</SplitHorizontal>
        <TopRowBottomPane>1</TopRowBottomPane>
        <ActivePane>2</ActivePane>
    </WorksheetOptions>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${styles}<Worksheet ss:Name="SI프로젝트현황"><Table>${colXml}<Row ss:Height="22">${hdrLabels.map(hdrCell).join('')}</Row>${dataRows}</Table>${wsOptions}</Worksheet></Workbook>`;
    const blob = new Blob(['﻿'+xml], {type:'application/vnd.ms-excel;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`SI프로젝트현황_${dateStr}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

