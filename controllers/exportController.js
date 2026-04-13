const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const Professor = require('../models/Professor');
const Room = require('../models/Room');
const Settings = require('../models/Settings');
const { generateDaySlots } = require('../services/slotEngine');

// Helper: build grid map from slots
const buildGrid = (slots, days, daySlots) => {
  const teaching = daySlots.filter(s => !s.isBreak);
  const grid = {};
  for (const day of days) {
    grid[day] = {};
    for (const slot of teaching) grid[day][slot.index] = null;
  }
  for (const slot of slots) {
    if (!grid[slot.day]) continue;
    grid[slot.day][slot.slotIndex] = slot;
  }
  return grid;
};

// Export class timetable as PDF
exports.classPDF = async (req, res) => {
  try {
    const { classId, semester, year } = req.query;
    const [classDoc, settings] = await Promise.all([
      Class.findById(classId),
      Settings.findOne()
    ]);
    const daySlots = generateDaySlots(settings);
    const timetable = await Timetable.findOne({ class: classId })
      .populate('slots.subject slots.professor slots.room');
    if (!timetable) { req.flash('error', 'No timetable found.'); return res.redirect('/timetable'); }

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="timetable-${classDoc.year}-${classDoc.division}.pdf"`);
    doc.pipe(res);

    const days = settings.workingDays;
    const teaching = daySlots.filter(s => !s.isBreak);

    // Title
    doc.fontSize(16).font('Helvetica-Bold')
      .text(`${settings.collegeName}`, { align: 'center' });
    doc.fontSize(12).font('Helvetica')
      .text(`${settings.departmentName} | ${classDoc.year}-${classDoc.division} | ${settings.academicYear}`, { align: 'center' });
    doc.moveDown(0.5);

    // Table setup
    const colW = 100;
    const rowH = 40;
    const startX = 30;
    let y = doc.y;

    // Header row: Day + slot times
    doc.fontSize(7).font('Helvetica-Bold');
    doc.rect(startX, y, colW, rowH).stroke();
    doc.text('Day / Time', startX + 2, y + 5, { width: colW - 4, align: 'center' });
    let x = startX + colW;
    for (const slot of teaching) {
      doc.rect(x, y, colW, rowH).stroke();
      doc.text(`${slot.startTime}\n${slot.endTime}`, x + 2, y + 5, { width: colW - 4, align: 'center' });
      x += colW;
    }
    y += rowH;

    // Data rows
    doc.font('Helvetica').fontSize(7);
    const grid = buildGrid(timetable.slots, days, daySlots);
    for (const day of days) {
      doc.rect(startX, y, colW, rowH).stroke();
      doc.font('Helvetica-Bold').text(day.substring(0, 3), startX + 2, y + 14, { width: colW - 4, align: 'center' });
      x = startX + colW;
      for (const slot of teaching) {
        const entry = grid[day] && grid[day][slot.index];
        doc.rect(x, y, colW, rowH).stroke();
        if (entry && entry.subject) {
          doc.font('Helvetica-Bold').text(entry.subject.code || entry.subject.name.substring(0, 8), x + 2, y + 3, { width: colW - 4, align: 'center' });
          doc.font('Helvetica').text(entry.professor ? entry.professor.name.split(' ')[0] : '', x + 2, y + 14, { width: colW - 4, align: 'center' });
          doc.text(entry.room ? entry.room.roomNumber : '', x + 2, y + 24, { width: colW - 4, align: 'center' });
          if (entry.batch) doc.text(`Batch:${entry.batch}`, x + 2, y + 32, { width: colW - 4, align: 'center' });
        }
        x += colW;
      }
      y += rowH;
    }

    doc.end();
  } catch (err) {
    console.error(err);
    req.flash('error', 'PDF export failed: ' + err.message);
    res.redirect('/timetable');
  }
};

// Export class timetable as Excel
exports.classExcel = async (req, res) => {
  try {
    const { classId } = req.query;
    const [classDoc, settings] = await Promise.all([
      Class.findById(classId),
      Settings.findOne()
    ]);
    const daySlots = generateDaySlots(settings);
    const timetable = await Timetable.findOne({ class: classId })
      .populate('slots.subject slots.professor slots.room');
    if (!timetable) { req.flash('error', 'No timetable found.'); return res.redirect('/timetable'); }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SPPU Timetable System';
    const ws = workbook.addWorksheet(`${classDoc.year}-${classDoc.division}`);

    const days = settings.workingDays;
    const teaching = daySlots.filter(s => !s.isBreak);

    // Title rows
    ws.mergeCells(1, 1, 1, teaching.length + 1);
    ws.getCell(1, 1).value = `${settings.collegeName} - ${settings.departmentName}`;
    ws.getCell(1, 1).font = { bold: true, size: 14 };
    ws.getCell(1, 1).alignment = { horizontal: 'center' };

    ws.mergeCells(2, 1, 2, teaching.length + 1);
    ws.getCell(2, 1).value = `Class: ${classDoc.year}-${classDoc.division} | Year: ${settings.academicYear}`;
    ws.getCell(2, 1).alignment = { horizontal: 'center' };

    // Header row
    const headerRow = ws.addRow(['Day / Time', ...teaching.map(s => `${s.startTime}-${s.endTime}`)]);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', wrapText: true };

    const grid = buildGrid(timetable.slots, days, daySlots);
    for (const day of days) {
      const rowData = [day];
      for (const slot of teaching) {
        const entry = grid[day] && grid[day][slot.index];
        if (entry && entry.subject) {
          let cell = `${entry.subject.name}`;
          if (entry.professor) cell += `\n${entry.professor.name}`;
          if (entry.room) cell += `\n${entry.room.roomNumber}`;
          if (entry.batch) cell += `\n[Batch ${entry.batch}]`;
          rowData.push(cell);
        } else {
          rowData.push('');
        }
      }
      const row = ws.addRow(rowData);
      row.height = 55;
      row.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    }

    // Column widths
    ws.getColumn(1).width = 14;
    for (let i = 2; i <= teaching.length + 1; i++) ws.getColumn(i).width = 22;

    // Borders on all cells
    ws.eachRow(row => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="timetable-${classDoc.year}-${classDoc.division}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    req.flash('error', 'Excel export failed: ' + err.message);
    res.redirect('/timetable');
  }
};
