John Hoffman:
	from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

def make_cover(filename, tagline=True):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    c.setTitle("Life Compass Cover by LovingSmiles")

    # Fonts
    c.setFont("Times-Bold", 24)
    c.drawCentredString(width/2, height-200, "LIFE COMPASS: STILLNESS AFTER THE FIRE")

    c.setFont("Helvetica", 14)
    c.drawCentredString(width/2, height-230, "A 3-Year Vision, Roadmap & Reflection Journal")

    c.setFont("Times-Italic", 12)
    c.drawCentredString(width/2, height-255, "by LovingSmiles")

    # Divider line
    c.setStrokeColor(colors.lightgrey)
    c.line(width/2-150, height-270, width/2+150, height-270)

    # Dedication
    c.setFont("Times-Italic", 11)
    c.setFillColor(colors.black)
    c.drawCentredString(width/2, height-295,
        "“Dedicated to everyone learning to rebuild their peace after the fire.”")

    # Tagline (optional)
    if tagline:
        c.setFont("Times-Italic", 11)
        c.drawCentredString(width/2, 130,
            "Guided by Faith. Strengthened by Fire. Moved by Stillness.")

    # Compass-Heart-Flame Seal (symbolic circle)
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(1)
    c.circle(width/2, 80, 30, stroke=1, fill=0)
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    c.drawCentredString(width/2, 75, "LIFE COMPASS")
    c.setFont("Helvetica-Oblique", 6)
    c.drawCentredString(width/2, 65, "by LovingSmiles")

    # Invisible micro-signature
    c.setFillColorRGB(1,1,1)
    c.setFont("Helvetica", 1)
    c.drawString(width/2-20, 40, "LovingSmilesInvisibleSignature")

    c.showPage()
    c.save()

