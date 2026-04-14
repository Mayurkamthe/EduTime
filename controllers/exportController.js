const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const Settings = require('../models/Settings');
const { generateDaySlots } = require('../services/slotEngine');

const buildGrid = (slots, days, daySlots) => {
  const grid = {};
  for (const day of days) {
    grid[day] = {};
    for (const s of daySlots) grid[day][s.index] = [];
  }
  for (const slot of slots) {
    if (grid[slot.day] !== undefined && grid[slot.day][slot.slotIndex] !== undefined) {
      grid[slot.day][slot.slotIndex].push(slot);
    }
  }
  return grid;
};

function styleHdr(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f2e' } };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 8 };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorder(cell);
}
function applyBorder(cell) {
  const b = { style: 'thin', color: { argb: 'FFaaaaaa' } };
  cell.border = { top: b, left: b, bottom: b, right: b };
}

exports.classPDF = async (req, res) => {
  try {
    const { classId } = req.query;
    const [classDoc, settings] = await Promise.all([Class.findById(classId), Settings.findOne()]);
    if (!classDoc || !settings) { req.flash('error', 'Not found.'); return res.redirect('/timetable'); }

    const daySlots = generateDaySlots(settings);
    const timetable = await Timetable.findOne({ class: classId })
      .populate('slots.subject slots.professor slots.room');
    if (!timetable) { req.flash('error', 'No timetable found.'); return res.redirect('/timetable'); }

    const days = settings.workingDays;
    const grid = buildGrid(timetable.slots, days, daySlots);

    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="timetable-${classDoc.year}-${classDoc.division}.pdf"`);
    doc.pipe(res);

    const PW = 820, ml = 20, mt = 12;

    // ── OUTER BORDER
    doc.rect(ml, mt, PW - 40, 68).stroke();

    // Record box (left)
    doc.rect(ml, mt, 130, 68).stroke();
    doc.fontSize(6).font('Helvetica')
      .text('Record No.: 4/2/2', ml+3, mt+4)
      .text('Revision: 03', ml+3, mt+14)
      .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, ml+3, mt+24);

    // College name (centre)
    doc.fontSize(10).font('Helvetica-Bold')
      .text(settings.collegeName.toUpperCase(), ml+130, mt+4, { width: PW-310, align: 'center' });
    doc.fontSize(7).font('Helvetica')
      .text('Department of ' + settings.departmentName, ml+130, mt+17, { width: PW-310, align: 'center' });
    doc.fontSize(9).font('Helvetica-Bold')
      .text('TIME TABLE', ml+130, mt+30, { width: PW-310, align: 'center' });
    doc.fontSize(7).font('Helvetica')
      .text(`Academic Year: ${settings.academicYear}    W.E.F.: ${new Date().toLocaleDateString('en-IN')}`, ml+130, mt+44, { width: PW-310, align: 'center' })
      .text(`Department: ${settings.departmentName}     Class: ${classDoc.year}-${classDoc.division}`, ml+130, mt+54, { width: PW-310, align: 'center' });

    // Roll No box (right)
    doc.rect(PW-170, mt, 150, 68).stroke();
    doc.fontSize(6).font('Helvetica').text('Roll No.', PW-165, mt+5);

    // ── GRID
    const tableTop = mt + 74;
    const dayColW = 62;
    const slotColW = Math.floor((PW - 40 - dayColW) / daySlots.length);
    const headerH = 24, rowH = 40;

    // Header
    let x = ml;
    doc.rect(x, tableTop, dayColW, headerH).fillAndStroke('#1a1f2e','#1a1f2e');
    doc.fillColor('white').fontSize(7).font('Helvetica-Bold')
      .text('Day/Time', x+2, tableTop+8, { width: dayColW-4, align: 'center' });
    x += dayColW;

    for (const slot of daySlots) {
      doc.rect(x, tableTop, slotColW, headerH).fillAndStroke('#1a1f2e','#1a1f2e');
      if (slot.isBreak) {
        doc.fillColor('white').fontSize(6).font('Helvetica-Bold')
          .text('BREAK', x+1, tableTop+8, { width: slotColW-2, align: 'center' });
      } else {
        doc.fillColor('white').fontSize(6).font('Helvetica-Bold')
          .text(`${slot.startTime}`, x+1, tableTop+4, { width: slotColW-2, align: 'center' });
        doc.fontSize(5).text(`${slot.endTime}`, x+1, tableTop+14, { width: slotColW-2, align: 'center' });
      }
      x += slotColW;
    }
    doc.fillColor('black');

    // Data rows
    days.forEach((day, di) => {
      const y = tableTop + headerH + di * rowH;
      x = ml;
      doc.rect(x, y, dayColW, rowH).fillAndStroke('#1a1f2e','#dee2e6');
      doc.fillColor('white').fontSize(7).font('Helvetica-Bold')
        .text(day.toUpperCase(), x+2, y+rowH/2-5, { width: dayColW-4, align: 'center' });
      x += dayColW;

      for (const slot of daySlots) {
        const entries = (grid[day] && grid[day][slot.index]) || [];
        const hasContent = entries.some(e => e.subject);

        let bg = di % 2 === 0 ? '#f8faff' : '#ffffff';
        if (slot.isBreak) bg = '#f0f0f0';
        else if (hasContent) {
          const t = entries[0].type;
          bg = t === 'lab' ? '#dcfce7' : t === 'tutorial' ? '#fef9c3' : '#dbeafe';
        }

        doc.rect(x, y, slotColW, rowH).fillAndStroke(bg, '#dee2e6');

        if (slot.isBreak) {
          doc.fillColor('#888').fontSize(5).font('Helvetica').text('LUNCH\nBREAK', x+1, y+12, { width: slotColW-2, align: 'center' });
        } else if (hasContent) {
          let ty = y+3;
          entries.filter(e => e.subject).forEach(e => {
            doc.fillColor('#1e3a5f').fontSize(6).font('Helvetica-Bold')
              .text(e.subject.code || e.subject.name.substr(0,8), x+1, ty, { width: slotColW-2, align: 'center' });
            ty += 8;
            if (e.professor) {
              doc.fillColor('#374151').fontSize(5).font('Helvetica')
                .text(e.professor.name.split(' ').pop(), x+1, ty, { width: slotColW-2, align: 'center' });
              ty += 7;
            }
            if (e.room) {
              doc.fillColor('#6b7280').fontSize(5)
                .text(e.room.roomNumber, x+1, ty, { width: slotColW-2, align: 'center' });
              ty += 6;
            }
            if (e.batch) {
              doc.fillColor('#b45309').fontSize(5).font('Helvetica-Bold')
                .text(`B-${e.batch}`, x+1, ty, { width: slotColW-2, align: 'center' });
            }
          });
        }
        doc.fillColor('black');
        x += slotColW;
      }
    });

    // ── SUBJECT LEGEND TABLE
    const legendTop = tableTop + headerH + days.length * rowH + 8;
    const legCols = [65, 145, 140, 40, 60, 45];
    const legHdrs = ['Choice Code','Subject Name','Faculty Name','TH/PR','Location','Batch'];

    doc.fontSize(7).font('Helvetica-Bold').text('Subject Details:', ml, legendTop);
    let lx = ml, ly = legendTop + 10;
    const legH = 13;

    legCols.forEach((w, i) => {
      doc.rect(lx, ly, w, legH).fillAndStroke('#1a1f2e','#1a1f2e');
      doc.fillColor('white').fontSize(5.5).font('Helvetica-Bold')
        .text(legHdrs[i], lx+2, ly+3, { width: w-4, align: 'center' });
      lx += w;
    });
    doc.fillColor('black');
    ly += legH;

    const seenSubj = new Set();
    let legIdx = 0;
    for (const slot of timetable.slots) {
      if (!slot.subject || seenSubj.has(slot.subject._id?.toString())) continue;
      seenSubj.add(slot.subject._id?.toString());
      const bg = legIdx % 2 === 0 ? '#f8faff' : '#ffffff';
      const vals = [
        slot.subject.code || '',
        slot.subject.name || '',
        slot.professor ? slot.professor.name : '',
        slot.type === 'lab' ? 'PR' : 'TH',
        slot.room ? slot.room.roomNumber : '',
        slot.batch ? `B${slot.batch}` : 'All'
      ];
      lx = ml;
      legCols.forEach((w, i) => {
        doc.rect(lx, ly, w, legH).fillAndStroke(bg, '#dee2e6');
        doc.fillColor('#1a1f2e').fontSize(5.5).font('Helvetica')
          .text(vals[i], lx+2, ly+3, { width: w-4, align: 'center' });
        lx += w;
      });
      ly += legH;
      legIdx++;
    }

    // ── FOOTER
    const footY = ly + 10;
    doc.fontSize(6).font('Helvetica').fillColor('#1a1f2e')
      .text('Prof. _________________', ml, footY)
      .text('Timetable Incharge', ml, footY+9)
      .text('Dr. _________________', PW/2 - 80, footY)
      .text('Head of Department', PW/2 - 80, footY+9)
      .text('Dr. _________________', PW - 180, footY)
      .text('Principal', PW - 180, footY+9);

    doc.end();
  } catch (err) {
    console.error(err);
    req.flash('error', 'PDF export failed: ' + err.message);
    res.redirect('/timetable');
  }
};

exports.classExcel = async (req, res) => {
  try {
    const { classId } = req.query;
    const [classDoc, settings] = await Promise.all([Class.findById(classId), Settings.findOne()]);
    if (!classDoc || !settings) { req.flash('error', 'Not found.'); return res.redirect('/timetable'); }

    const daySlots = generateDaySlots(settings);
    const timetable = await Timetable.findOne({ class: classId })
      .populate('slots.subject slots.professor slots.room');
    if (!timetable) { req.flash('error', 'No timetable found.'); return res.redirect('/timetable'); }

    const days = settings.workingDays;
    const grid = buildGrid(timetable.slots, days, daySlots);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'EduTime';
    const ws = wb.addWorksheet(`${classDoc.year}-${classDoc.division}`, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    const totalCols = daySlots.length + 1;

    // Header rows
    ws.mergeCells(1, 1, 1, totalCols);
    ws.getCell(1,1).value = `Record No.: 4/2/2  |  Revision: 03  |  Date: ${new Date().toLocaleDateString('en-IN')}`;
    ws.getCell(1,1).font = { size: 7 }; ws.getRow(1).height = 12;

    ws.mergeCells(2, 1, 3, totalCols);
    ws.getCell(2,1).value = settings.collegeName.toUpperCase();
    ws.getCell(2,1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    ws.getCell(2,1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f2e' } };
    ws.getCell(2,1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 24;

    ws.mergeCells(4, 1, 4, totalCols);
    ws.getCell(4,1).value = `Department of ${settings.departmentName}  |  Class: ${classDoc.year}-${classDoc.division}  |  Academic Year: ${settings.academicYear}`;
    ws.getCell(4,1).font = { bold: true, size: 9 };
    ws.getCell(4,1).alignment = { horizontal: 'center' };

    ws.mergeCells(5, 1, 5, totalCols);
    ws.getCell(5,1).value = 'TIME TABLE';
    ws.getCell(5,1).font = { bold: true, size: 14, color: { argb: 'FF0d6efd' } };
    ws.getCell(5,1).alignment = { horizontal: 'center' };
    ws.getRow(5).height = 20;

    // Slot headers
    const HDR = 7;
    ws.getCell(HDR, 1).value = 'Day / Time';
    styleHdr(ws.getCell(HDR, 1));
    daySlots.forEach((slot, i) => {
      const c = ws.getCell(HDR, i+2);
      c.value = slot.isBreak ? 'BREAK' : `${slot.startTime}\n${slot.endTime}`;
      styleHdr(c);
    });
    ws.getRow(HDR).height = 28;

    // Data rows
    days.forEach((day, di) => {
      const rowNum = HDR + 1 + di;
      const dc = ws.getCell(rowNum, 1);
      dc.value = day.toUpperCase();
      dc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1f2e' } };
      dc.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      dc.alignment = { horizontal: 'center', vertical: 'middle' };
      applyBorder(dc);

      daySlots.forEach((slot, i) => {
        const cell = ws.getCell(rowNum, i+2);
        const entries = (grid[day] && grid[day][slot.index]) || [];
        if (slot.isBreak) {
          cell.value = 'LUNCH BREAK';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf0f0f0' } };
          cell.font = { italic: true, size: 7, color: { argb: 'FF888888' } };
        } else if (entries.some(e => e.subject)) {
          const lines = entries.filter(e => e.subject).map(e => {
            const p = [e.subject.code || e.subject.name.substr(0,8)];
            if (e.professor) p.push(e.professor.name.split(' ').pop());
            if (e.room) p.push(e.room.roomNumber);
            if (e.batch) p.push(`B-${e.batch}`);
            return p.join('\n');
          });
          cell.value = lines.join('\n---\n');
          const t = entries[0].type;
          cell.fill = { type: 'pattern', pattern: 'solid',
            fgColor: { argb: t==='lab' ? 'FFdcfce7' : t==='tutorial' ? 'FFfef9c3' : 'FFdbeafe' } };
          cell.font = { size: 8 };
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        applyBorder(cell);
      });
      ws.getRow(rowNum).height = 50;
    });

    // Legend
    const LEG = HDR + 1 + days.length + 2;
    ['Choice Code','Subject Name','Faculty Name','TH/PR','Location','Batch'].forEach((h, i) => {
      styleHdr(ws.getCell(LEG, i+1));
      ws.getCell(LEG, i+1).value = h;
    });
    const seen = new Set(); let lr = LEG + 1;
    for (const slot of timetable.slots) {
      if (!slot.subject || seen.has(slot.subject._id?.toString())) continue;
      seen.add(slot.subject._id?.toString());
      [slot.subject.code||'', slot.subject.name||'',
       slot.professor ? slot.professor.name : '',
       slot.type==='lab' ? 'PR' : 'TH',
       slot.room ? slot.room.roomNumber : '',
       slot.batch ? `B-${slot.batch}` : 'All'
      ].forEach((v, i) => {
        const c = ws.getCell(lr, i+1);
        c.value = v;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lr%2===0 ? 'FFf8faff' : 'FFFFFFFF' } };
        applyBorder(c);
      });
      lr++;
    }

    // Footer
    ws.getCell(lr+2, 1).value = 'Prof. ___________________\nTimetable Incharge';
    ws.getCell(lr+2, Math.floor(totalCols/2)).value = 'Dr. ___________________\nHead of Department';
    ws.getCell(lr+2, totalCols-1).value = 'Dr. ___________________\nPrincipal';

    ws.getColumn(1).width = 13;
    for (let i = 2; i <= totalCols; i++) ws.getColumn(i).width = 15;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="timetable-${classDoc.year}-${classDoc.division}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    req.flash('error', 'Excel export failed: ' + err.message);
    res.redirect('/timetable');
  }
};
