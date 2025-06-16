using System;
using System.Windows;
using System.Windows.Media;
using System.Windows.Shapes;

namespace PoliciasYLadrones
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void GenerarLaberinto_Click(object sender, RoutedEventArgs e)
        {
            EscenarioCanvas.Children.Clear();

            // Obstáculos poligonales (puedes generar más dinámicamente)
            Polygon obstaculo1 = new Polygon
            {
                Fill = Brushes.DarkSlateGray,
                Stroke = Brushes.Black,
                StrokeThickness = 2,
                Points = new PointCollection
                {
                    new Point(100,100),
                    new Point(200,100),
                    new Point(180,180),
                    new Point(120,180)
                }
            };

            Polygon obstaculo2 = new Polygon
            {
                Fill = Brushes.DarkOliveGreen,
                Stroke = Brushes.Black,
                StrokeThickness = 2,
                Points = new PointCollection
                {
                    new Point(300,200),
                    new Point(400,220),
                    new Point(390,290),
                    new Point(310,270)
                }
            };

            EscenarioCanvas.Children.Add(obstaculo1);
            EscenarioCanvas.Children.Add(obstaculo2);

            // Carrito de policía (azul)
            Rectangle policia = new Rectangle
            {
                Width = 30,
                Height = 20,
                Fill = Brushes.Blue
            };
            Canvas.SetLeft(policia, 20);
            Canvas.SetTop(policia, 20);
            EscenarioCanvas.Children.Add(policia);

            // Carro rojo (ladrón)
            Rectangle ladron = new Rectangle
            {
                Width = 30,
                Height = 20,
                Fill = Brushes.Red
            };
            Canvas.SetLeft(ladron, 720);
            Canvas.SetTop(ladron, 500);
            EscenarioCanvas.Children.Add(ladron);
        }
    }
}
