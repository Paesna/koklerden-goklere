# Köklerden Göklere: Elektrik ve Elektronik
## Eğitmen Rehberi (5. Hafta)

Bu rehber `Koklerden_Goklere_Sunum.html` sunumunun konuşmacı notlarından otomatik olarak üretilmiştir. Aynı notlar sunum sırasında konuşmacı penceresinde (P tuşu) görünür.

Dersin ilkesi: **her şey bilimsel olarak kanıtlanmış bilgiye dayanır, hiçbir şey denenmez.** Priz ve vücut konusu ölçülmüş verilerle (IEC 60479-1) anlatılır; öğrencilere hiçbir şekilde deneme önerilmez.

Sunum 77 slayttır ve tek bir ders saatine sığmak zorunda değildir. Sayfa sayısı değil, her sayfada durup anlatabildiğimiz önemlidir; ders iki ya da üç oturuma bölünebilir. Akış: **Elektrik → Devre → PCB → Sensör → Bilgisayar**.

---

## Sunumu açmak

1. Klasörü `lib` alt klasörüyle birlikte kopyalayın. İnternet gerekmez.
2. `Koklerden_Goklere_Sunum.html` dosyasını Chrome veya Edge ile açın.
3. Projeksiyona bağlıyken `Win + P` ile **Uzat** modunu seçin; sunum penceresini projeksiyona taşıyıp `F` ile tam ekran yapın.
4. `P` ile konuşmacı notlarını ayrı pencerede açın ve kendi ekranınızda tutun.

| Tuş | İşlev |
|---|---|
| Sağ ok, Page Down, boşluk | Sonraki slayt |
| Sol ok, Page Up | Önceki slayt |
| Home / End | İlk / son slayt |
| G | Slayt haritası (bölümlere göre atlama) |
| P | Konuşmacı penceresi (notlar, süre, sıradaki slayt) |
| F | Tam ekran |
| Q | 3B görsel kalitesini düşük (çok akıcı) / otomatik arasında değiştirir; bilgisayar zorlanıyorsa kullanın |

**3B görseller:** fareyle sürükleyerek çevirin, tekerlekle yaklaşın, çift tıklayarak başlangıç görünümüne dönün. Dokunulmadığında her görsel kendi kendini anlatan bir döngüde çalışır; bir sürgüye ya da düğmeye bastığınızda kontrol sizde olur. Slayta yeniden geldiğinizde görsel baştan başlar.

**Hesap kutuları:** sürgüler değiştikçe gerçek hesap (× ÷ − +) canlı güncellenir. Öğrencilere önce sonucu tahmin ettirin, sonra sürgüyle doğrulayın.

**Simülasyon laboratuvarı:** bazı slaytların altındaki bağlantılar `Elektronik_ve_Bilgisayar_Simulasyonu.html` dosyasındaki ilgili modülü yeni sekmede açar (ölçek yolculuğu, malzemenin içi, kablonun içi, pilin içi, devre ve Ohm, vücut ve akım, sinyal).

---

## Slayt notları

### Giriş

#### 01. Kapak

**Açılış.** Elinizdeki telefon, kumdan elde edilen silisyumdan, camdan ve bakır gibi metallerden yapılmış cansız bir nesne. Nasıl oluyor da bir mesajı neredeyse anında dünyanın öbür ucuna ulaştırıyor? Bu derslerde, bu sorunun cevabına giden bütün basamakları göreceğiz.

**Akış:** Elektrik → Devre → PCB → Sensör → Bilgisayar. Algoritma ve kodlama sonraki derslerin konusu; sonda yalnızca kapısını aralayacağız.

**Kullanım:** 3B görselleri fareyle sürükleyip çevirebilir, tekerlekle yaklaşabilirsiniz; çift tıklama görünümü sıfırlar. Sürgüler ve düğmeler canlıdır; hesap kutuları anında güncellenir. G tuşu slayt haritasını, P tuşu bu notları açar.

**Arka plan:** artı ve eksi yük arasındaki elektrik alan çizgileri; akan noktalar alanın yönünü gösterir (artıdan eksiye).

#### 02. Fizik nedir?

**Fizik doğanın dilidir; matematik bu dilin dilbilgisidir.** Işık 1 km'yi yaklaşık 3,3 mikrosaniyede geçer, yani şimşeği hemen görürüz. Ses 20 °C havada saniyede yaklaşık 343 m gider (hava ısındıkça biraz hızlanır).

**Kural:** şimşekle gök gürültüsü arasındaki saniyeyi 3'e bölün: yaklaşık kilometre.

**Sınıfa soru:** Arada 9 saniye varsa fırtına ne kadar uzakta? **Cevap:** 9 ÷ 3 ≈ 3 km.

Görsel gerçek zamanlıdır: sınıfla birlikte saniyeleri sayabilirsiniz. 2 km'de ses 5,8 s'de gelir; kural 5,8 ÷ 3 ≈ 1,9 km verir: kural yaklaşık bir kestirmedir.

**Şimşek de elektriktir:** bulutta biriken yükler havayı delip yere ya da başka bir buluta atlar. Dev bir kıvılcımdır; bu dersin konusu o kıvılcımın arkasındaki bilimdir.

**Güvenlik:** Gök gürültüsünü duyabiliyorsanız yıldırım size ulaşabilecek kadar yakındır. Saniyeleri her zaman kapalı bir binanın ya da aracın içinden sayın; fırtınada açık alanda, tek başına duran ağaçların altında ya da suda kalınmaz.

#### 03. Doğanın matematiği

Bu slayt bir ön izlemedir. Her işlem sonra kendi slaytında ayrıntılı açılacak:

**Toplama:** seri bağlı piller (Pil slaytındaki “9 V pil” düğmesi: 6 × 1,5 V = 9 V). **Çıkarma:** kuşun iki ayağı arasındaki gerilim farkı sıfır, bu yüzden akım geçmez (“Prize elimi sokarsam?” slaytında tekrar). **Çarpma:** güç = gerilim × akım (Güç ve enerji slaytı). **Bölme:** akım = gerilim ÷ direnç (Ohm yasası). **Mantık:** VE, VEYA, DEĞİL (Bilgisayar bölümü).

**Mantık görseli:** A kapağın kapalı olup olmadığını (1 = kapalı), B düğmeye basılıp basılmadığını (1 = basıldı), Q ise makinenin çalışıp çalışmadığını gösterir; Q sonucun, yani çıkışın adıdır. Döngünün ikinci yarısında kapak açıkken düğmeye basılır: 0 VE 1 = 0, tambur dönmez. VE, yalnızca iki koşul da 1 olduğunda 1 verir.

**Sınıfa soru:** Telin üstündeki kuş 10.000 volta dokunuyorsa neden zarar görmez? **Cevap:** Akım, iki nokta arasında gerilim farkı varsa akar. Kuşun iki ayağı da aynı teldedir: 10.000 − 10.000 = 0.

**Mutlaka ekleyin:** Kuş yalnızca tek bir tele dokunduğu ve başka hiçbir şeye değmediği için güvendedir; vücudunun iki ucu da aynı gerilimdedir, fark 10.000 − 10.000 = 0 V olur. Kanadı aynı anda ikinci bir tele ya da direğe değen büyük kuşlar (leylek gibi) bu yüzden çarpılarak ölür. Yerde, merdivende ya da direkte duran bir insan tele dokunursa eli 10.000 V'ta, ayakları 0 V'ta olur: 10.000 − 0 = 10.000 V. Akım vücuttan toprağa geçer ve bu ölümcüldür. Bunu kesinlikle denemeyin: yüksek gerilim hattına dokunmak bile gerekmez, çok yaklaşıldığında elektrik havadan atlayabilir (ark). Bu yüzden hatlardan, direklerden ve yere düşmüş tellerden uzak durulur.

#### 04. Her şey elektrikle

**Bilimsel arka plan.** Moleküldeki atomları bir arada tutan kimyasal bağlar elektriksel etkileşimdir (H₂'de iki proton iki elektronu paylaşır). Retinadaki çubuk ve koni hücreleri ışığı elektrik sinyaline çevirir. Miyelinli sinir liflerinde sinyal Ranvier boğumundan boğumuna atlar ve 100 m/s'yi aşabilir. Kalbin ritmini sinoatriyal düğüm başlatır.

**Sınıfa soru:** Elektrik olmasaydı hangisi çalışmazdı: telefon mu, siz mi? **Cevap:** İkisi de.

#### 05. Köklerden göklere

Beş durağı kısaca okuyun. Kökler atomdur; gökler uydular ve haberleşmedir. Her durak bir öncekine dayanır. PCB'yi adıyla söyleyin: baskılı devre kartı; parçaları taşıyan ve bakır yollarla birbirine bağlayan kart.

Bu slayt dersin haritasıdır; uzun bir ders olduğu için gerekirse ikinci derse kaldığınız yerden devam edebilirsiniz (G tuşu ile slayt haritası).

### 1 · Elektrik

#### 06. Atomun içine yolculuk

**Ölçekler.** Kablo yaklaşık 10⁻² m, tek bir bakır tel 10⁻⁴ m, kristal taneleri 10⁻⁶ m, atomlar arası mesafe yaklaşık 2,5 × 10⁻¹⁰ m, bakır çekirdeği yaklaşık 10⁻¹⁴ m.

**Atom dizisi durağı:** Bakır küreler, en dıştaki elektronunu ortak kullanıma bırakmış bakır atomlarıdır; bunlara bakır iyonu denir. Aralarında dolaşan mavi noktalar bu serbest elektronlardır (elektron denizi). Ayrıntısı “Elektronlar atomdan nasıl kopar?” slaytında; burada yalnızca adlarını duyurmanız yeterli.

**Bakır atomu:** 29 proton, çoğunlukla 34 nötron (bakır-63), 29 elektron. Katmanlara 2, 8, 18 ve 1 elektron dağılır; en dıştaki tek elektron birazdan önemli olacak.

**Sınıfa soru:** Atom bir futbol stadyumu kadar olsaydı çekirdek ne kadar olurdu? **Cevap:** Ortadaki bir nohut kadar. Gerisi elektronların bulunabileceği boşluktur.

Düğmelerle istediğiniz durağa gidebilirsiniz; dokunmazsanız yolculuk kendiliğinden tekrarlanır.

#### 07. Atom ve elektron

**Modelin sınırını açıkça söyleyin.** Halkalı çizim anlatım içindir (Bohr, 1913). Kuantum mekaniğine göre elektronun belirli bir yörüngesi yoktur; çekirdeğin çevresinde bulunma olasılığı bir bulut gibi dağılır. Bulutun yoğun olduğu yerde elektronu bulma ihtimali yüksektir.

**Elektron:** ölçülebilen bir boyutu yoktur (noktasal kabul edilir), yükü −1,602 × 10⁻¹⁹ C, kütlesi 9,109 × 10⁻³¹ kg'dır. Karbonda 6 elektron vardır: 2'si 1s, 2'si 2s, 2'si 2p bölgesinde.

**1s, 2s, 2p ne demek?** Baştaki sayı katmanı gösterir (1. katman, 2. katman). Harf, elektronun bulunabileceği bölgenin biçimidir: s küre biçimlidir, p ise iki loblu, halter biçimlidir. Üstteki küçük sayı o bölgedeki elektron sayısıdır: 1s² 2s² 2p² → 2 + 2 + 2 = 6. Görselde iki ayrı 2p etiketi var, çünkü karbonun iki 2p elektronu birbirinden ayrı iki p bölgesine yerleşir.

**Sınıfa soru:** Bir elektronu görebilir miyiz? **Cevap:** Hayır; çok küçüktür ve onu görmek için kullanacağımız ışık bile onu yerinden oynatır. Bulut, nerede bulunabileceğinin haritasıdır.

#### 08. Yük ve kuvvet

**Coulomb yasası:** iki yük arasındaki kuvvet, yüklerin çarpımıyla doğru, aralarındaki uzaklığın karesiyle ters orantılıdır (F = k × q₁ × q₂ ÷ d²). Mesafe yarıya inince kuvvet 4 katına, üçte birine inince 9 katına çıkar.

**Günlük hayat:** saçınıza sürttüğünüz tarak elektron kazanır ve kâğıt parçalarını çeker; kazağı çıkarırken duyduğunuz çıtırtılar küçük kıvılcımlardır.

**Yüklenme:** çevremizdeki cisimler çoğunlukla yüksüzdür: artı ve eksi yük eşit sayıdadır. Sürtünmeyle elektron bir cisimden ötekine geçince cisim yüklenir (tarak, balon). Ölçek: 1 coulomb yaklaşık 6,24 milyar milyar elektronun yüküdür; saç tarağında biriken yük bunun milyarda biri kadardır.

**Sınıfa soru:** Elektronlar neden çekirdeğin üzerine düşmez? **Cevap:** Bu sorunun cevabı kuantum mekaniğindedir: elektron belirli bir noktada duramaz, bir bulut gibi yayılır. Lise ve üniversitede ayrıntısını öğreneceksiniz.

**Sınıfa soru:** Çekirdekteki protonların hepsi artı yüklü ve birbirine çok yakın. Neden birbirini itip dağılmazlar? **Cevap:** Çekirdekte elektriksel itmeden başka bir kuvvet daha vardır: güçlü nükleer kuvvet. Proton ve nötronları birbirine bağlar. Çekirdek boyutundaki çok kısa mesafede elektriksel itmeden çok daha güçlüdür, ama etkisi çekirdeğin dışına neredeyse hiç ulaşmaz. Ayrıntısını lisede ve üniversitede göreceksiniz.

#### 09. Elektronlar atomdan nasıl kopar?

**Metalik bağ:** komşu atomların dış elektron bulutları iç içe geçer; elektron artık tek bir atoma değil bütün kristale aittir (en dıştaki elektrona değerlik elektronu da denir). Her serbest elektronun karşılığında geride bir artı iyon kaldığı için metal yine de yüksüzdür. “29 − 28 = 1” perdeleme hesabı basitleştirilmiş bir modeldir; gerçekte perdeleme tam olmaz.

**Kopma ne demek?** Metal atomları kristal içinde yan yana gelince en dış elektronların bulutları üst üste biner. Bu elektronlar artık tek bir atoma ait değildir; bütün kristale yayılır. Geride kalan atomlar artı yüklü iyonlardır (Cu⁺). Buna metalik bağ, serbest elektronlara da elektron denizi denir.

**Sayı:** 1 cm³ bakırda yaklaşık 8,5 × 10²² serbest elektron vardır (85.000 milyar milyar).

**Diğer yollar:** Sürtünme (statik elektrik), ışık (fotoelektrik olay, güneş panelleri) ve ısı da elektronları atomlardan koparabilir.

**Sınıfa soru:** Serbest elektronlar kristalden dışarı neden kaçmaz? **Cevap:** Artı yüklü iyonlar onları kristalin içinde tutar; dışarı çıkmak için ek enerji gerekir.

#### 10. İletken, yalıtkan, yarı iletken

**Tabloyu okuyun.** Solda ve ortada metaller, sağ üstte ametaller, aralarındaki ince şeritte yarı metaller. Hidrojen sol üstte durur ama ametaldir. Soy gazlar (He, Ne, Ar…) bağ kurmaz; elektronlarını kendi atomlarında tutarlar, onlar da yalıtkandır. Koyu çerçeveli elementler bu derslerde geçenler: H, Li, B, C, N, O, Na, Al, Si, P, S, Cl, K, Cu, Zn, Ge, Ag, Au.

**Metaller** elektron denizi sayesinde iletir. **Ametaller** elektronlarını kovalent bağlarda paylaşır: iki atom elektronlarını ortak kullanır ve elektron iki atomun arasında kilitli kalır. Isıtılınca bu bağların bir kısmı kopar; yarı iletken böyle iletmeye başlar. **Silisyum** ikisinin arasındadır ve şaşırtıcı bir özelliği vardır: ısıtılınca daha iyi iletir (metallerde tersi olur).

**Turuncu halkalar:** Oda sıcaklığında bile ısı, silisyumda çok az sayıda elektronu bağından koparır. Kopan elektronun bağda bıraktığı eksiğe boşluk denir; komşu bağdaki bir elektron bu eksiğe atlayınca boşluk yer değiştirir. Ayrıntısı “Yarı iletken nedir?” slaytında.

**Sınıfa soru:** Kabloların dışı neden plastik? **Cevap:** Kablo plastiği (çoğunlukla PVC) karbon, hidrojen ve klor atomlarından kurulu uzun zincirlerdir; hepsi ametaldir, serbest elektron yoktur. İçerideki bakır akımı taşır, dıştaki plastik bizi korur.

**Sınıfa soru:** Kurşun kalem ucu neden iletir? **Cevap:** Kalem ucu grafittir. Grafitte her karbon atomu yalnızca üç komşusuyla bağ kurar; dördüncü elektron katmanlar boyunca serbestçe dolaşır. Elmasta ise dört elektronun dördü de bağdadır. Atomların nasıl bağlandığı da önemlidir.

#### 11. Tırnağınız neden iletmez?

**Doğru terim:** tırnak ve saç keratindir; kitin böceklerin dış iskeletinde ve mantarların hücre duvarında bulunur. İkisi de element değil moleküldür ve yalnızca ametal atomlarından oluşur. Keratindeki kükürt, sistein amino asidinden gelir ve tırnağa sertliğini veren disülfit köprülerini kurar.

**Önemli uyarı:** Bu bilgi asla “tırnakla dokunursam bir şey olmaz” anlamına gelmez. Tırnağın yüzeyi ve cilt nemlidir; iyon taşıyan su akıma yol açar.

**Sınıfa soru:** Saf su elektriği iletir mi? **Cevap:** Çok az. Suyu iletken yapan, içinde çözünmüş tuzlardır. Bu konu dokunmatik ekran slaytında yeniden karşımıza çıkacak.

#### 12. Akım nedir?

**Tanım:** akım = yük ÷ zaman. 1 amper = saniyede 1 coulomb yük. Bir elektronun yükü 1,602 × 10⁻¹⁹ C olduğu için 1 C ÷ (1,602 × 10⁻¹⁹ C) ≈ 6,24 × 10¹⁸ elektron eder.

**Benzetme:** Bir köprüden saniyede geçen araç sayısı gibi. Ölçtüğümüz şey tek bir aracın hızı değil, bir saniyede geçen araç sayısıdır; araçlar hızlanırsa bu sayı da artar (Gerilim nedir? slaytında göreceğiz).

**Günlük hayat:** telefon şarjı 1–3 A, LED 0,02 A, su ısıtıcısı yaklaşık 9 A.

Sürgüyle akımı artırın: kesitten geçen elektron sayısının nasıl arttığını gösterin. Görselde ortak kayma abartılmıştır; elektronların rastgele hareketi ise gerçekte çok daha hızlıdır (bakırda saniyede yaklaşık 1.600 km).

#### 13. Enerji nedir?

**Enerjinin korunumu** (termodinamiğin birinci yasası): Mayer, Joule ve Helmholtz 1840'larda gösterdi.

**Zincir:** Güneş'in çekirdeğindeki füzyon ışık üretir → ışık denizi ısıtır, su buharlaşır → yağmur yüksek bir barajı doldurur (yükseklik enerjisi) → su türbini döndürür (hareket enerjisi) → jeneratörde dönen mıknatıs bobinde akım oluşturur (Faraday, 1831) → elektrik evimize gelir → lamba onu ışığa ve ısıya çevirir.

**Jeneratör:** santralde bir mıknatıs, tel sargının (bobinin) içinde döner. Değişen manyetik etki teldeki elektronları bir ileri bir geri iter; prizdeki alternatif akım böyle doğar. Güneş paneli dışında çoğu santral bu ilkeyle çalışır.

**“Çoğu zaman”** dememizin nedeni: nükleer ve jeotermal santrallerin enerjisi Güneş'ten gelmez; atom çekirdeğinden ve yerin içindeki ısıdan gelir.

**Elektrik enerjisi:** yükler gerilim farkı boyunca ilerlerken kazandıkları enerjidir. Her coulomb yük, gerilim kadar joule taşır (bir sonraki slayt).

**Joule:** 100 g'lık bir elmayı 1 m yukarı kaldırmak yaklaşık 1 J enerji ister (0,1 kg × 9,8 m/s² × 1 m ≈ 1 J). Bu enerjilerin okuldaki adları: yükseklik (potansiyel) enerjisi ve hareket (kinetik) enerjisi.

**Sınıfa soru:** Lamba ışık verirken enerji kayboluyor mu? **Cevap:** Hayır. Elektrik enerjisi ışığa ve ısıya dönüşür; ışık da duvarlarda ve eşyalarda soğurulunca ısıya döner. Sonunda enerjinin neredeyse tamamı ısı olarak odada kalır (bir kısmı pencere ve duvardan dışarı sızar); hiçbiri yok olmaz. Oda yalnızca çok az ısınır, çünkü lambanın gücü küçüktür.

#### 14. Gerilim nedir?

**Önemli fikir:** Elektronlar her zaman hareket eder: oda sıcaklığında rastgele, çok hızlı (bakırda saniyede yaklaşık 1.600 km) ama her yöne eşit. Gerilim uygulanınca bu rastgele harekete küçük bir ortak kayma eklenir; akım bu kaymadır.

**Gri oklar:** (yön sorusu bir sonraki slaytta ayrıntılı işleniyor) elektrik alanını gösterir: gerilimin artı bir yükü iteceği yön, yani artıdan eksiye. Elektronlar eksi yüklü olduğu için okların tersine, artı uca doğru kayar. Akımın kabul edilen yönü (Akım nedir? slaytındaki bakır renkli ok) okların yönüyle aynıdır. Görseldeki kayma hızı abartılı gösterilmiştir.

**Hesap:** tel direnci 10 Ω varsayıldı: I = V ÷ R. Gerçek sürüklenme hızı (bazı kaynaklarda “kayma hızı”) v = I ÷ (n · e · A); n: 1 m³ bakırdaki serbest elektron sayısı (yaklaşık 8,5 × 10²⁸), e: bir elektronun yükü (1,6 × 10⁻¹⁹ C), A: telin kesit alanı (1 mm² = 10⁻⁶ m²). 1 mm² bakır telde 1 amperde yaklaşık 0,07 mm/s.

Sürgüyü 0'a getirin: net akış durur. Sonra yavaşça artırın: kayma hızlanır, akım değeri artar.

**Sınıfa soru:** Gerilimi iki katına çıkarırsak akım ne olur? **Cevap:** Direnç aynı kalırsa akım da iki katına çıkar.

#### 15. Elektronlar bir yöne, akım öbür yöne

**Üç ayrı şey:** (1) Elektronların gerçek hareketi: eksi yüklüdürler, pilin eksi ucundan artı ucuna giderler. (2) Elektrik alanı: artı bir deneme yükünün itileceği yönü gösterir, yani artıdan eksiye. (3) Akım yönü: alanla aynı yön, artıdan eksiye. Elektronlar eksi olduğu için alana ters yönde itilir; bu yüzden elektronlar akım yönünün tersine gider. İki yön birbiriyle çelişmez; aynı olayı iki farklı şeyi izleyerek anlatırlar.

**“Hata kimin?”** Sık duyulan “Coulomb'un hatası” doğru değil. Coulomb (1785) yalnızca iki yük arasındaki kuvvetin yasasını buldu. Artı ve eksi adlarını 1747'de Benjamin Franklin verdi. O zamanlar elektriğin, cisimlerden cisimlere akan tek bir akışkan olduğu sanılıyordu. Franklin camı ipeğe sürtünce camda biriken yüke “artı” dedi ve akışkanın artıdan eksiye aktığını varsaydı: iki seçenekten birini seçti. Elektronu 1897'de J. J. Thomson buldu; metallerde akan şeyin eksi yüklü olduğu ortaya çıktı. Yani Franklin'in tahmini bu durumda tutmadı. Ama o zamana kadar bütün kitaplar, formüller ve şemalar bu yönle yazılmıştı. Hata kimseye ait değil; sadece yarım bilgiyle atılmış bir adımdı.

**Franklin'in tahmini düğmesi:** metalde artı yükler sağa gitse de, eksi yükler sola gitse de devrenin dışından bakınca aynı şey olur: ampermetre aynı değeri okur, lamba aynı yanar. Bu yüzden iki tarif de devre için eşdeğerdir.

**Sınıfa soru:** Elektronlar yavaş yürüyorsa lamba nasıl hemen yanıyor? **Cevap:** Kablo baştan sona elektronla doludur; itiş (elektrik alanı) kablo boyunca çok hızlı yayılır ve bütün elektronlar neredeyse aynı anda kaymaya başlar. Hızlı olan elektronlar değil, itiştir.

#### 16. Neden hâlâ eski yönü kullanıyoruz?

Önceki slaytı özetleyin: üç şey var, hiçbiri yanlış değil. “Franklin yanlış yaptı” demek yerine “o zaman elektron bilinmiyordu” deyin. Kısa bir soru sorun: “Bir kapıdan sağa giden eksi yük ile sola giden artı yük aynı şey midir?” Cevap: Kapının öbür tarafındaki yük sayısı iki durumda da aynı değişir; devre için aynıdırlar.

**Teknik not:** metallerde taşıyıcı elektronlardır; elektrolitlerde (tuzlu su, pil içi) hem artı hem eksi iyonlar taşır; yarı iletkenlerde elektron ve boşluk birlikte taşır; plazmada ikisi birden. “Gerçek yön” dediğimiz şey bu yüzden maddeye göre değişir; uzlaşım yön hepsi için ortak bir dildir.

Bu slaytı sonraki konulara bağlayın: diyot ve LED sembolündeki ok akımın geçebildiği (artıdan eksiye) yönü gösterir; LED'in uzun bacağı artı uçtur.

#### 17. Pil

**Alkalin pil (AA):** eksi tarafta çinko tozu jeli, artı tarafta mangan dioksit, aralarında iyonları geçiren bir ayırıcı ve potasyum hidroksit elektroliti vardır. Çinko elektron verir (Zn + 2 OH⁻ → ZnO + H₂O + 2 e⁻; oksijeni elektrolitteki OH⁻ iyonlarından alır); elektronlar dış devreden, lambanın içinden geçerek artı uca gider ve mangan dioksit tarafından alınır. İçeride OH⁻ iyonları devreyi tamamlar.

**Neden 1,5 V?** Bu iki maddenin kimyası bu kadar itiş üretir. Daha yüksek gerilim için hücreler arka arkaya dizilir: 9 V'luk pilin içinde altı küçük hücre vardır: 6 × 1,5 V = 9 V.

**Tarih:** 1800'de Volta çinko ve bakır diskleri tuzlu suya batırılmış kartonlarla üst üste dizdi: ilk pil.

**Sınıfa soru:** Şarj edilebilir pil şarj olurken ne olur? **Cevap:** Dışarıdan verilen elektrik, kimyasal tepkimeyi tersine çevirir; enerji yeniden kimyasal olarak depolanır.

#### 18. Direnç nedir?

**Neden direnç?** Kristaldeki iyonlar sıcaklıkla titreşir; elektronlar bu titreşimlere çarparak yön değiştirir. Uzun tel daha çok çarpışma demektir (direnç artar); kalın tel elektronlara daha çok yol açar (direnç azalır). Direnç ∝ uzunluk ÷ kesit.

**Isı:** Çarpışmalarda elektronların kazandığı enerji iyonlara geçer ve metal ısınır. Isıtıcılar bunu bilerek kullanır; kablolar ise bu yüzden yeterince kalın seçilir.

**Üçüncü etken, malzeme:** direnç telin cinsine de bağlıdır (özdirenç; R = ρ × uzunluk ÷ kesit alanı). Bu slayt, malzeme aynı kalırken yalnızca boyu ve kesiti değiştirir. Aynı boy ve kalınlıkta nikel-krom tel, bakırdan yaklaşık 65 kat fazla direnç gösterir; ütü ve ısıtıcılarda bu yüzden nikel-krom tel kullanılır, kablolarda ise bakır.

**Sınıfa soru:** Su ısıtıcısı gibi güçlü cihazlar neden ince bir uzatma kablosuna takılmaz? **Cevap:** Güçlü cihaz büyük akım çeker; ince kablonun direnci daha yüksektir, ısı ise akımın karesiyle artar (P = I² × R). Kablo aşırı ısınır, kılıfı erir, yangın çıkabilir. Bu yüzden kablolar taşıyacakları akıma göre seçilir ve bunu denemeyiz.

#### 19. Ohm yasası

**Ohm yasası:** I = V ÷ R. Aynı ilişki V = I × R ve R = V ÷ I olarak da yazılır; üçü aynı cümledir.

**Örnek:** 9 V ÷ 450 Ω = 0,02 A = 20 mA. Direnci ikiye katlayın (900 Ω): akım yarıya iner (10 mA).

**Sınırı:** Ohm yasası metal teller ve dirençler için, sıcaklık değişmedikçe geçerlidir. LED ve diyot gibi yarı iletkenler bu düz orantıya uymaz; LED belli bir eşik geriliminden sonra yanar. Bu yüzden LED'li devre slaytında LED'in yaklaşık 2 V'unu ayrıca çıkarırız.

**Renk bantları:** Dirençler yalnızca belirli hazır değerlerde üretilir (standart değerler). Görseldeki direnç, sürgüdeki değere en yakın hazır değerin renklerini taşır (450 Ω için 470 Ω). Hesap sürgüdeki değerle yapılır; renk kodunu ilerideki “Direnci yakından tanıyalım” slaytında okuyacağız.

Sürgülerle gerilimi ve direnci değiştirin; ampermetre ibresi ve hesap kutusu birlikte değişir. Öğrencilere sonucu önce tahmin ettirin, sonra sürgüyle doğrulayın.

**Sınıfa soru:** Devrede lamba ya da direnç gibi bir yük hiç olmasaydı ne olurdu (yalnızca düşünce deneyi)? **Cevap:** R çok küçülür, I = V ÷ R çok büyür. Kabloların ve pilin küçücük direnci bu büyük akımla ısınır: buna kısa devre denir (Elektrik bir döngü ister slaytı). Direnç, akımı kontrol etmenin aracıdır.

#### 20. Güç ve enerji

**Neden çarpım?** V = I × R yazarsak P = V × I = (I × R) × I = I × I × R olur; bu, santral slaytındaki ısı kaybı formülünün kaynağıdır.

**Güç:** P = V × I. 230 V × 0,26 A ≈ 60 W. Isıtıcı 2.000 W: 2.000 ÷ 230 ≈ 8,7 A çeker.

**Enerji:** E = P × t. 9 W'lık LED ampul 100 saatte 0,9 kWh, 2.000 W'lık ısıtıcı yarım saatte 1 kWh harcar.

**Sayaç:** Görseldeki klasik sayaçta alüminyum disk, gücün büyüklüğüyle orantılı hızda döner; sayaç tekerlekleri dönüşleri sayar. Bugün evlerde çoğunlukla elektronik sayaçlar kullanılır ama ilke aynıdır.

**220 mi, 230 mu?** Türkiye'de prizler eskiden 220 V'tu; bugünkü standart 230 V'tur. Günlük dilde hâlâ “220” denir.

**Sınıfa soru:** Aynı ışığı veren LED ampul eski tip (akkor, telli) ampulden neden daha ucuza gelir? **Cevap:** Daha az watt çeker; telli ampul enerjinin çoğunu ışık yerine ısıya çevirir.

#### 21. Akkor lamba nasıl çalışır?

**Konu ve bağlantı:** “Direnç nedir?” slaydında elektronların metalin titreyen iyonlarına çarptığını ve enerjilerinin ısıya dönüştüğünü gördük. “Güç ve enerji” slaydında 60 W'lık eski tip (akkor, telli) ampulle 9 W'lık LED ampulü karşılaştırdık ve telli ampulün enerjinin çoğunu ısıya çevirdiğini söyledik. Bu slayt, aynı şeyin ampulün içinde nasıl göründüğünü gösterir: ısınan ince bir tel. LED'in nasıl ışık verdiğini bu derslerde daha sonra göreceğiz; burada LED'in içine girmiyoruz.

**Kısa tarih:** 1879'da Joseph Swan (İngiltere) ve Thomas Edison (ABD) kullanışlı elektrik ampulünü geliştirdi; ilk ampullerin teli karbondu. Tungsten tel 1900'lerin başında yaygınlaştı ve telli ampuller bugünkü hâlini aldı.

**Lamba düğmesi, ampulün içi:** Kesit görünümünde şunlar vardır. (1) Cam balon: teli dış etkilerden korur. (2) Gaz dolgusu: balonun içi argon ve azot gazı karışımıyla doldurulur (bazı küçük ampullerde balonun içi havasızdır, yani vakumdur). (3) Filaman, yani tungsten tel: çok ince, bükülü bükülü sarılmış tel. (4) Destek telleri: filamanı havada tutar. (5) Cam ayak: besleme tellerini taşıyan ve balonu tabana bağlayan cam parça. (6) Besleme telleri: akımı kontaklardan filamana taşıyan iki tel. (7) Vidalı taban (Edison vidası): ampulü yuvaya vidalarız; tabanın iki kontağı vardır. Alttaki küçük metal nokta “kontak ucu”, vidalı metal gövde ise “vida yanı” kontağıdır; aralarında yalıtkan vardır. İki besleme teli bu iki kontağa ayrı ayrı bağlıdır ve birbirine değmez. Akım bir kontaktan girer, filamandan geçer, öbür kontaktan çıkar: her devrede olduğu gibi bir halka. Slaytta mavi noktalar elektronlardır ve yavaşlatılmıştır. Evdeki akım saniyede 100 kez yön değiştirir (alternatif akım), ama telli ampul için yönün önemi yoktur: tel her iki yönde de aynı şekilde ısınır.

**Tel neden ısınır?** Filamanın direnci büyüktür. “Güç ve enerji” slaydındaki gibi P = V × I = I × I × R. 60 W'lık ampul için I = P ÷ V = 60 ÷ 230 ≈ 0,26 A. Sıcakken direnç R = V ÷ I = 230 ÷ 0,26 ≈ 880 Ω olur. Isı gücü I × I × R = 0,26 × 0,26 × 880 ≈ 60 W: ampulün gücüdür. Çarpışma düğmesinde görüldüğü gibi elektronlar tungsten iyonlarına çarpar; her çarpışmada enerjilerinin bir kısmı iyonlara geçer ve iyonlar daha şiddetli titreşir. Titreşimin büyümesi, telin daha sıcak olması demektir. Akım ne kadar büyükse çarpışma ve ısı o kadar çoktur; slayttaki titreşim, renk ve ısı okları bunu gösterir.

**Kalın kablo neden parlamaz?** Aynı akım (0,26 A) hem ampulün telinden hem kablodan geçer, çünkü devre bir halkadır; akım hiçbir yerde azalmaz. Fark dirençtedir. Kalın bakır kablonun kesiti geniştir, direnci çok küçüktür: bir metrelik, 0,75 mm² kesitli bakır kablonun direnci yaklaşık 0,02 Ω'dur. Isı gücü 0,26 × 0,26 × 0,02 ≈ 0,001 W: ihmal edilebilir; kablo ısınmaz. Filaman ise hem çok ince (dar kesit) hem uzundur (uzun yol); “Direnç nedir?” slaydında gördüğümüz gibi ince ve uzun telde direnç büyüktür. Tel düğmesindeki kesit karşılaştırması bunu gösterir: aynı sayıda elektron, kalın kabloda geniş bir yoldan, ince telde dar bir yoldan geçer.

**Tel neden bükülü bükülü?** Direnç yüksek olsun diye tel uzun olmalıdır; düzleştirilseydi onlarca santimetre uzunluğunda olurdu. Telin önce sarmal, sonra o sarmalın da sarmal yapılması (bükülü bükülü tel) uzun teli küçük balona sığdırır. Ayrıca komşu sarımlar birbirini ısıtır ve çevredeki gaza kaybedilen ısı azalır; tel daha sıcak ve daha parlak olur. Slayttaki sarmal sayıları ve boyutlar ölçekli değildir.

**Neden parlar, rengi neden değişir?** Sıcak her cisim ışık yayar; buna ısıl ışıma denir. Ocakta kızaran demir, mum alevi, Güneş de böyledir. Cismin parçacıkları ne kadar şiddetli titreşiyorsa o kadar enerjili ışık yayılır. Oda sıcaklığındaki cisimler yalnızca kızılötesi ışık yayar; gözümüz bunu görmez, deriyle ısı olarak hissederiz. Yaklaşık 600-700 °C'den sonra koyu kırmızı görünür ışık başlar. Sıcaklık arttıkça renk kırmızıdan turuncuya, sarıya, sonunda beyaza doğru kayar. Slayttaki yaklaşık değerler: 50 V'ta filaman yaklaşık 800 °C (koyu kırmızı), 120 V'ta yaklaşık 1.800 °C (turuncu-sarı), 230 V'ta yaklaşık 2.500 °C (sarımsı beyaz). Bunlar modelden alınmış yaklaşık değerlerdir; gerçek ampulde sayılar biraz değişebilir ama sıralama ve fikir doğrudur.

**Neden tungsten?** Tungsten, metaller arasında erime noktası en yüksek olandır: 3.422 °C. Telin 2.500 °C'de çalışabilmesi için bu şarttır; demir yaklaşık 1.540 °C'de, bakır 1.085 °C'de erir. Tungsten ayrıca ince tel hâline getirilebilir.

**Neden enerjinin çoğu ısı?** 2.500 °C'de telin yaydığı ışığın büyük kısmı kızılötesidir; gözle görülen kısım küçük bir dilimdir. Telli ampulde harcanan enerjinin yalnızca yaklaşık %5'i görünür ışık olur, geri kalanı ısıdır. 60 W'lık ampulde bu yaklaşık 3 W ışık ve 57 W ısı demektir; bu yüzden ampulün camı çok sıcaktır ve oda biraz ısınır. 9 W'lık LED ampul yaklaşık aynı ışığı verir: ışık yine yaklaşık 3 W, ısı yaklaşık 6 W. LED, önce bir teli ısıtmadan ışık yapar; bu yüzden aynı ışık için çok daha az enerji harcar ve çok daha serindir. LED'in içinde ışığın nasıl oluştuğunu bu derslerde sonra göreceğiz. 60 ÷ 9 ≈ 6,7: telli ampul aynı ışık için yaklaşık 6,7 kat güç çeker.

**Cam balonun içi neden gaz dolu (ya da havasız)?** Tungsten sıcakken havadaki oksijenle hemen yanar (tungsten oksit olur). Teli yanmaktan korumak için balonda oksijen bulunmaz: ya vakum ya da argon-azot gazı vardır. Gaz ayrıca tungstenin buharlaşmasını yavaşlatır; böylece tel daha sıcak çalışabilir ve ömrü uzar. Gazın ısıyı bir miktar dışarı taşıması bunun bedelidir; tel sarmalı bu kaybı azaltır.

**Tel neden sonunda kopar?** 2.500 °C'de tungsten çok yavaş buharlaşır: atomlar telden ayrılır ve camın iç yüzüne yapışır (eski ampullerin kararması bundandır). Tel zamanla incelir. Ama tel her yerde aynı hızda incelmez: bir yer biraz daha ince olursa orada direnç daha büyük olur, ısı I × I × R ile orada daha çok çıkar, orası daha sıcak olur, daha hızlı buharlaşır ve daha da incelir. Kendini hızlandıran bu süreç, teli sonunda en ince yerinden koparır. Telli bir ampulün ömrü tipik olarak yaklaşık 1.000 saattir.

**Neden çoğu kez açarken yanar?** Tungstenin direnci sıcaklıkla güçlü biçimde artar: soğukken direnç, sıcak hâlinin yaklaşık 10'da biri kadardır. Yani soğuk telin direnci yaklaşık 880 ÷ 10 = 88 Ω'dur. Anahtarı açtığımız anda akım I = 230 ÷ 88 ≈ 2,6 A olur: normal çalışma akımının (0,26 A) yaklaşık 10 katı. Tel saniyenin çok küçük bir bölümünde ısınır, direnç büyür ve akım 0,26 A'e düşer. Bu ilk büyük akım, özellikle zaten incelmiş zayıf noktayı zorlar. Bu nedenle ampuller çoğu kez anahtar açılırken yanar. Bu slaytta “her zaman” değil, “çoğu kez” deriz.

**Aynı fikir başka nerede?** Isıtıcı direnç telleri: ekmek kızartma makinesi (içindeki tel kırmızı parlar), elektrikli soba, saç kurutma makinesi (ısıtıcı tel ve pervane), ütü (tabanın içinde ısıtıcı direnç), su ısıtıcı (kettle). Bunlarda tungsten yerine çoğunlukla nikel-krom (nichrome) tel kullanılır: erime noktası yaklaşık 1.400 °C'dir, havada yanmayı önleyen koruyucu bir oksit tabakası oluşturur ve kırmızı parlayan sıcaklık bu aletler için yeterlidir. Bu aletler ışık için değil ısı için yapılmıştır. Sigorta da aynı fikirle çalışır: ince bir tel normal akımda ısınmaz, ama akım çok artarsa I × I × R ısısı hızla büyür (akım 2 katına çıkarsa ısı 4 katına çıkar), tel erir ve devre kesilir; böylece kabloları ve cihazı korur. Evlerdeki otomatik sigortalar farklı (ısıl ve manyetik) çalışır, ama fikir aynıdır: akım çoksa devreyi kes.

**Güvenlik:** Yanan ya da yeni sönmüş telli ampulün camı çok sıcaktır; dokunulmaz, yanık yapar. Ampul takılırken ya da sökülürken elektrik kesilmiş olmalıdır (anahtar kapalı, tercihen sigorta kapalı) ve ampul soğumuş olmalıdır; elektrik varken yuvaya parmak ya da metal nesne sokulmaz. Kırık ampulün cam parçaları keskindir; çıplak elle toplanmaz, önce elektrik kesilir. Slayttaki hiçbir şey denenecek bir deney değildir; 230 V ile gerçekte deney yapılmaz.

**Sınıfa soru 1:** Ampulün kablosu da aynı akımı taşıyor; neden kablo parlamıyor da tel parlıyor? **Cevap:** Akım aynıdır ama direnç çok farklıdır: filaman ince ve uzundur, direnci yaklaşık 880 Ω'dur; kalın bakır kablonun direnci yaklaşık 0,02 Ω'dur. Isı I × I × R olduğundan ısı yalnızca filamanda çıkar.

**Sınıfa soru 2:** Ampuller neden çoğu kez anahtarı açtığımız anda yanar? **Cevap:** Soğuk telin direnci sıcak hâlinin yaklaşık 10'da biridir; açılış anında akım yaklaşık 10 kat büyüktür (230 ÷ 88 ≈ 2,6 A). Bu ani yük, zaten incelmiş zayıf noktayı koparır.

**Öğrencilerin aklına gelebilecek sorular:** “Tel ısınınca neden erimiyor?” Tungstenin erime noktası 3.422 °C, tel ise yaklaşık 2.500 °C'de çalışıyor. “Gazda yanmaz mı?” Balonda oksijen yok; yanma için oksijen gerekir. “Ampul neden turuncu değil de sarımsı beyaz?” Tel yaklaşık 2.500 °C'de; sıcaklık yükseldikçe renk beyaza gider. Gerilimi düşürürsek sıcaklık düşer, renk turuncuya ve kırmızıya döner; bunu ışığı kısılan lambalarda görürüz. “LED neden serin?” LED, teli ısıtarak ışık yapmaz; bu yüzden enerjinin çok daha küçük bir bölümü ısıya gider (yine de biraz ısınır). Ayrıntısını sonra göreceğiz.

**Bağlantı:** Geri: “Direnç nedir?” ve “Güç ve enerji”. İleri: LED ve yarı iletken konuları (ışığın tel ısıtılmadan üretilmesi) ve sigorta ile koruma konuları.

#### 22. Mıknatıs ve elektrik

**Konu:** Öğrenciler yüklerin itip çektiğini, elektrik alanını, akımı, gerilimi ve gücü biliyor. Mıknatısı hiç görmediler; jeneratörün mıknatıs ve bobinle çalıştığını, transformatörün alternatif gerilimi değiştirdiğini ve radyo dalgalarında “manyetik alan” sözünü yalnızca duydular. Bu slayt o eksik parçayı tamamlar: elektrik ve mıknatıslık iki ayrı konu değil, tek olayın iki yüzüdür. Görsel kendi kendine altı görünümü sırayla gösterir (her biri yaklaşık 8 saniye); düğmeye basınca otomatik gezinti durur. Alttaki üç satırlık özet her zaman görünür ve o an anlatılan satır renklenir. Sarım, çekirdek ve hız düğmeleri yalnızca bobin ve indükleme görünümlerinde etkilidir.

**1 · Mıknatıs ve manyetik alan:** Mıknatıs, demir, nikel ve kobalt gibi maddeleri çeken cisimdir. Her mıknatısın iki ucu vardır: kuzey (N) ve güney (S) kutup. Aynı kutuplar iter, farklı kutuplar çeker; tıpkı elektrik yüklerinde aynı işaretin itmesi, farklı işaretin çekmesi gibi. Ama bir fark var: yükler tek başına bulunabilir (yalnız artı, yalnız eksi), kutuplar bulunamaz. Mıknatısı ortadan kırarsak iki küçük mıknatıs olur ve her birinin yine N ve S ucu vardır. **Manyetik alan**, mıknatısın çevresinde başka bir mıknatısa kuvvet uygulayan bölgedir. Elektrik alanını oklarla çizmiştik; manyetik alan da çizgilerle çizilir. Kural: mıknatısın dışında çizgiler kuzey kutbundan çıkar, güney kutbuna girer (mıknatısın içinde güneyden kuzeye döner, yani çizgiler kapalı halkadır). Çizgilerin sık olduğu yerde alan güçlüdür; kutuplara yakın yerler gibi. Pusula iğnesi küçük bir mıknatıstır: kırmızı ucu alanın yönünü gösterecek biçimde döner. Dünya da dev bir mıknatıs gibi davrandığı için pusula kuzeyi gösterir. Güçlü mıknatıslar parmağı sıkıştırabilir; sınıfta okul tipi küçük mıknatıs kullanın.

**2 · Akım mıknatıs gibi davranır (Oersted, 1820):** Danimarkalı fizikçi Hans Christian Oersted, ders sırasında akım geçen bir telin yanındaki pusula iğnesinin saptığını gördü. Bu, elektrik ile mıknatıslık arasındaki bağlantının ilk kanıtıdır. Tel akım taşırken çevresinde, tele dik düzlemde, halkalar biçiminde manyetik alan oluşur; telden uzaklaştıkça alan zayıflar. Akım kesilince iğne yeniden Dünya’nın alanına döner. Neden? Duran yük yalnızca elektrik alanı yapar; hareket eden yük, yani akım, ayrıca manyetik alan yapar. **Sağ el kuralı:** sağ elin başparmağını akımın (konvansiyonel, artıdan eksiye) yönüne tutun, kalan dört parmağın kıvrıldığı yön manyetik alanın yönüdür. Görselde soldaki halkalar teli, akım size doğru gelirken üstten gösterir; alan saat yönünün tersine döner. Sağdaki yandan görünüşte akım yukarı gider ve halkaların ön yarısı sağa doğru ilerler.

**3 · Bobin ve elektromıknatıs:** Tek bir telin alanı zayıftır. Teli bir silindir üzerine sararsak (bobin), her sarımın alanı bobinin içinde aynı yöne bakar ve toplanır; dışarıda ise bir çubuk mıknatısın alan desenine benzer. Bobin için sağ el kuralı: dört parmak akımın dolandığı yönü gösterirse başparmak bobinin kuzey ucunu gösterir. Alan şiddeti sarım sayısı ve akımla artar (görselde sarımı 1, 3, 6 yapınca ataş sayısı artar). İçine yumuşak demir koyarsak demirin içindeki çok küçük mıknatıs bölgeleri alana uyup aynı yöne dizilir ve alan kat kat, gerçekte yüzlerce kat güçlenir. Buna **elektromıknatıs** denir. Asıl üstünlüğü kapatılabilmesidir: akımı kesince yumuşak demir mıknatıslığını büyük ölçüde yitirir ve ataşlar düşer. Hurdalıktaki vinç, kapı zili, röle, hoparlör ve hastanedeki MR cihazı elektromıknatıs kullanır. Görseldeki ataş sayıları örnek ölçektir, gerçek değer değildir.

**4 · Değişen alan gerilim oluşturur (Faraday, 1831):** Tersini düşünelim: mıknatıstan akım elde edilir mi? Michael Faraday, mıknatısı bobine yaklaştırıp uzaklaştırınca bobine bağlı ölçü aletinin saptığını gördü. Mıknatıs duruyorsa, bobinin hemen yanında bile olsa, gerilim yoktur; gerilimi yaratan şey mıknatısın kendisi değil, bobinden geçen alanın değişmesidir. Yaklaşırken bir yöne, uzaklaşırken ters yöne sapar. Mıknatıs ne kadar hızlı hareket ederse alan o kadar hızlı değişir ve gerilim o kadar büyük olur; bobinde sarım sayısı ne kadar fazlaysa her sarım gerilime katkı verdiği için gerilim o kadar büyük olur. Görselde ölçü aletinin kadranında sıfır ortadadır; “0,4 V” gibi değerler örnektir. Bobin bir devreye bağlıysa gerilim akım da yürütür. Bu akım kendi alanıyla mıknatısın hareketine karşı koyar (Lenz kuralı): mıknatısı bobine itmek kolay değildir, elimiz enerji harcar. Elektrik enerjisi bedava çıkmaz; hareket enerjisi elektrik enerjisine dönüşür.

**5 · Jeneratör, neden alternatif akım:** Mıknatısı bobinin yanında döndürürsek, kuzey ucu bobine bakarken alan bobinden bir yönde, güney ucu bakarken ters yönde geçer. Alanın yönü sürekli değişir; bu yüzden gerilim bir yarım turda artı, sonraki yarım turda eksi olur ve grafik bir sinüs dalgası çizer. Bu, alternatif akımdır. Bir tam tur bir tam salınımdır. Şebekede saniyede 50 tur, yani 50 Hz vardır: bir tur 1 ÷ 50 = 0,02 s = 20 ms sürer. Görsel, gözle izlenebilsin diye çok yavaşlatılmıştır. Santralde mıknatısı su (baraj), buhar (kömür, doğal gaz ya da nükleer ısıyla elde edilen) veya rüzgâr türbini döndürür; yani her santral bir “mıknatıs döndürme” düzeneğidir, farklı olan yalnızca türbini döndüren enerji kaynağıdır. Gerçek jeneratörlerde bobin sabit, mıknatıs (çoğunlukla elektromıknatıs) döner; çok kutuplu baraj jeneratörleri 50 Hz’i saniyede 50 turdan daha yavaş dönerek verir. Bisiklet dinamosu da aynı fikirdir.

**6 · Motor, jeneratörün tersidir:** Mıknatısın alanındaki bir telden akım geçirirsek tel, hem alana hem akıma dik bir kuvvet hisseder (kuvvet = alan × akım × tel boyu). Halkanın iki kenarında akım zıt yönde olduğundan bir kenar yukarı, öbür kenar aşağı itilir ve halka döner. Halka yarım tur dönünce kenarların yeri değişir; akım aynı kalsa kuvvet ters yöne dönüp halkayı geri çekerdi. Bunu önlemek için **komütatör** denen yarım halkalar ve fırçalar akımın yönünü tam o anda çevirir; böylece sağdaki kenar hep yukarı, soldaki hep aşağı itilir. Görseldeki tek halkalı motor basit bir şemadır; gerçek motorlarda yüzlerce sarım, demir çekirdek ve çok sayıda kutup vardır. Motorun milini elle döndürürsek devre jeneratör gibi gerilim üretir; elektrikli araçlar fren yaparken motoru jeneratör olarak kullanıp aküyü şarj eder.

**Daha önce gördüklerimizle bağlantı:** “Enerji nedir?” bölümünde jeneratörün mıknatıs ve bobinle çalıştığını söylemiştik; şimdi nedenini biliyoruz. Transformatör gerilimi değiştirir: birinci bobinden geçen alternatif akım değişen bir manyetik alan yapar, ikinci bobin bu değişen alanı yakalayıp gerilim üretir. Pilin sabit (doğru) akımı sabit alan yapar, sabit alan gerilim oluşturmaz; bu yüzden transformatör doğru akımla çalışmaz. Kaçak akım rölesinin halkası da bir bobindir: gidiş ve dönüş telleri halkanın içinden geçer; akımlar eşitse alanlar birbirini götürür, akımın bir kısmı başka yoldan kaçarsa halkada alan kalır, bobinde gerilim oluşur ve röle devreyi keser. Hoparlör bir motor gibi çalışır: bobinden ses akımı geçince bobin mıknatısın alanında itilip çekilir ve zar titreşir. Kablosuz şarj aletinde şarj tabanındaki bobinden alternatif akım geçer, telefondaki bobin değişen alanı yakalar. Anten, çok hızlı değişen akımla hem elektrik hem manyetik alan yayar; radyo dalgalarında duyduğumuz “manyetik alan” budur.

**Tek olayın iki yüzü:** Akım manyetik alan yapar (Oersted, 1820); değişen manyetik alan gerilim yapar (Faraday, 1831); akım ile manyetik alan birlikte kuvvet doğurur (motor). Bunların hepsi elektromanyetizma denen tek kuvvetin görünüşleridir. 1865’te James Clerk Maxwell bu olayları denklemlerde birleştirdi ve değişen elektrik alanın manyetik alan, değişen manyetik alanın da elektrik alan yaptığını gösterdi; böylece ikisinin birbirini taşıyarak uzayda yayılabileceğini, ışığın ve radyo dalgalarının elektromanyetik dalga olduğunu buldu.

**Güvenlik:** Bu slayttaki her şey pil, küçük mıknatıs ve ince telle yapılan deneyleri anlatır. Prizdeki gerilimle bobin ya da tel denemek tehlikelidir; gerçekte denenmez. Güçlü mıknatıslar parmağı sıkıştırabilir ve küçük çocuklara verilmemelidir.

**Sınıfa soru 1:** Neden prizdeki elektrik jeneratörde alternatif akım olarak doğar? **Cevap:** Jeneratörde mıknatıs döner. Kuzey kutbu bobine bakarken alan bobinden bir yönde, güney kutbu bakarken ters yönde geçer; alanın yönü yarım turda bir değişir. Bobindeki gerilim de yarım turda bir işaret değiştirir: artı, eksi, artı, eksi. Bu yüzden akım doğal olarak ileri geri gider.

**Sınıfa soru 2:** Mıknatısı bobinin yanında hareketsiz tutarsak lamba yanar mı? **Cevap:** Hayır. Gerilimi alanın kendisi değil, değişmesi oluşturur. Mıknatıs ya da bobin hareket edince gerilim doğar, durunca sıfır olur. Bu yüzden jeneratör sürekli döndürülmelidir; santralde türbin hiç durmaz.

**Sınıfa soru 3:** Bir elektromıknatısı nasıl daha güçlü yaparız? **Cevap:** Sarım sayısını artırırız, akımı artırırız ya da içine demir çekirdek koyarız. Üçünde de alan güçlenir.

**Sonraki slayt:** “Doğru ve alternatif akım”. Artık jeneratörün neden alternatif akım ürettiğini ve pilin neden tek yönlü akım verdiğini biliyoruz; orada iki akımın grafiğini yan yana göreceğiz.

#### 23. Doğru ve alternatif akım

**DC:** pil, telefon, bilgisayarın içi, güneş paneli. **AC:** evlerdeki prizler, şehir şebekesi.

**Sayılar:** 50 Hz = saniyede 50 tam salınım, yani 50 × 2 = 100 yön değişimi. Bir salınım 1 ÷ 50 = 0,02 s = 20 ms sürer; grafikte 60 ms'de 3 salınım görünür. 230 V etkin değerdir: aynı ısıtmayı yapan sabit gerilim. Tepe değer bunun yaklaşık 1,414 katıdır (√2): 230 × 1,414 ≈ 325 V.

**Neden AC?** Transformatörler yalnızca değişen akımla çalışır; gerilimi kolayca yükseltip düşürürler. Bunu “Santralden prizinize” slaytında göreceğiz.

**Neden ileri geri?** Jeneratörde mıknatıs bobinin içinde döner. Mıknatısın kuzey kutbu bobine yaklaşırken elektronları bir yöne, uzaklaşırken öbür yöne iter. İki kutuplu bir jeneratör saniyede 50 tur dönerek 50 Hz üretir; çok kutuplu baraj jeneratörleri aynı frekansı daha yavaş dönerek verir.

**Sınıfa soru:** Akım saniyede 100 kez yön değiştiriyorsa lamba neden titremiyor? **Cevap:** Göz bu hızı ayırt edemez; akkor lambanın teli de o kısa sürede soğumaz.

#### 24. Elektrik nasıl yol alır?

**Hesap:** I = n · e · A · v. Bakırda n ≈ 8,5 × 10²⁸ /m³. 1 A ve 1,5 mm² kesitte v ≈ 0,05 mm/s, yani saatte yaklaşık 18 cm.

**Enerji** elektromanyetik alanla taşınır; kablolarda yayılma hızı ışık hızının yaklaşık %50–99'u arasıdır, tipik değer üçte iki civarı.

**Sayaçlar gerçek zamanlıdır:** 2 saniyede elektronlar 0,1 mm ilerlerken enerji 400.000 km yol alabilir; bu, Ay'ın uzaklığından (384.400 km) fazladır.

**Sınıfa soru:** Santralden çıkan elektronlar evinize kaç günde ulaşır? **Cevap:** Hiç ulaşmaz. Evdeki elektronlar zaten kablonun içindedir; prizdeki alternatif akımda yerlerinde ileri geri salınırlar. Santralden gelen şey enerjidir.

#### 25. Santralden prizinize

**Yolculuk:** santraldeki jeneratör 10–25 kV üretir → yükseltici transformatör 154–400 kV'a çıkarır → iletim hatları → trafo merkezinde 34,5 kV'a düşer → mahalledeki dağıtım transformatörü 400/230 V'a indirir → evinizin prizi.

**Dikkat:** ısı formülündeki akım, hattın kendisinden geçen akımdır. Gerilim yükselince aynı güç için akım azalır, kayıp da azalır. Örnek: 100 kW güç, 230 V'ta 100.000 ÷ 230 ≈ 435 A; 23.000 V'ta 100.000 ÷ 23.000 ≈ 4,35 A.

**400 / 230 V:** mahalle hattında üç faz teli ve bir nötr teli vardır. İki faz teli arasındaki gerilim 400 V, bir faz teli ile nötr arasındaki gerilim 230 V'tur. Evlere 230 V girer. Slayttaki formülde hesabı basit tutmak için mahalle hattının 400 V'unu kullandık; amaç yalnızca “gerilim düşünce akım artar” ilişkisini göstermektir.

**Matematik:** Güç = gerilim × akım. Aynı gücü 1.000 kat daha yüksek gerilimle taşırsak akım 1.000 kat küçülür. Neden karesi? Kablonun direnci R ise iki ucu arasında V = I × R kadar gerilim düşer; kabloda ısıya dönüşen güç P = V × I = (I × R) × I = I × I × R olur. Dikkat: buradaki V, hattın 400.000 V'u değil, kablonun kendi üzerindeki küçük gerilim düşümüdür. Akım iki kez çarpıldığı için 1.000 kat daha az akım, 1.000 × 1.000 = 1.000.000 kat daha az ısı kaybı demektir.

**Trafo (transformatör):** alternatif akımda gerilimi yükselten ya da düşüren cihaz. Demir bir çekirdeğe sarılmış iki tel sargıdan oluşur; birinci sargıdaki değişen akımın manyetik etkisi ikinci sargıda gerilim oluşturur. Sarım sayılarının oranı gerilimlerin oranıdır.

**Sınıfa soru:** Yüksek gerilim hatlarına neden asla yaklaşılmaz? **Cevap:** Yüz binlerce voltluk gerilim havayı bile delip ark oluşturabilir; dokunmak bile gerekmez.

#### 26. Birimler

Öğrencilere evdeki şarj aletlerinin etiketini **yalnızca okumalarını** önerin. **Şarj aletleri açılmaz:** fişten çekildikten sonra bile içindeki kondansatör bir süre yük tutabilir.

**Etiket:** Giriş 100–240 V ~ 50/60 Hz: dünyadaki bütün prizlerde çalışır. Çıkış 5 V ⎓ 3 A: telefona doğru akım verir. 5 V × 3 A = 15 W. “~” alternatif akımın, düz ve kesik çizgi (⎓) doğru akımın işaretidir.

**İç yapısı (soldan sağa):** önce diyotlar prizdeki alternatif akımı doğru akıma çevirir; büyük kondansatör (kısa süreliğine yük biriktiren küçük bir depo) dalgalanmayı düzeltir. Sonra küçük bir çip bu akımı saniyede on binlerce kez açıp kapatır; böylece akım yeniden değişen hale gelir ve transformatör çalışabilir. Küçük transformatör gerilimi düşürür; çıkıştaki diyot ve kondansatör telefona düzgün 5 V doğru gerilim verir. Diyotları Devre bölümünde yakından tanıyacağız.

**Birimler birbirine bağlı:** A = C ÷ s · V = J ÷ C · W = J ÷ s · Ω = V ÷ A.

**Listede olmayan iki birim:** C · coulomb (yük, Charles-Augustin de Coulomb) ve J · joule (enerji, James Prescott Joule). Ön eklerle: 2 kΩ = 2.000 Ω · 20 mA = 0,02 A · 3 GHz = 3 milyar Hz.

**mAh ve kWh** Bilgisayar bölümünde telefon bataryasıyla tekrar karşımıza çıkacak.

#### 27. Vücudumuz ve elektrik

**Sinir hücresi:** dinlenme potansiyeli yaklaşık −70 mV; sinyal iletirken kısa süreliğine +30 mV civarına çıkar (aksiyon potansiyeli). **EKG:** deride yaklaşık 1 mV büyüklüğünde.

**Deri:** kuru derinin direnci düşük gerilimlerde onlarca, hatta yüzlerce kiloohm olabilir; ıslak deride ve yüksek gerilimde çok düşer.

**Sınıfa soru:** Banyoda elektrikli alet kullanmak neden tehlikelidir? **Cevap:** Islak deri direnci düşürür; aynı gerilim çok daha büyük bir akım geçirir (I = V ÷ R).

#### 28. Prize elimi sokarsam?

**Bu slayt bilimdir, deney değil.** Hiçbir şekilde denenmeyeceğini net ve sakin bir dille söyleyin.

**Hesap:** 230 V ÷ 1.000–2.000 Ω ≈ 115–230 mA. Yaklaşık 10 mA'de kaslar kasılır ve el bırakamaz (alternatif akım kasları sürekli kasar; parmakları kapatan kaslar daha güçlüdür). 30 mA civarında solunum güçleşir. 50 mA ve üzerinde, özellikle akım göğüs boyunca geçerse kalp ritmi bozulabilir.

**Neden pil zararsız?** 1,5 V ÷ 100.000 Ω = 0,015 mA: hissedilmez bile. Gerilim küçükse akım da küçüktür. Ohm yasasında direnci sabit almıştık; deride ise yüksek gerilim koruyucu dış katmanı aşar ve direnç düşer. Ayrıca pil ve akü doğru akım verir; görseldeki bölgeler 50 Hz alternatif akım içindir ve doğru akımda aynı etkiler için daha büyük akım gerekir (hissetme eşiği yaklaşık 2 mA). Yani ölçek pil ve akü için güvenli taraftadır. Hiçbir koruma cihazı prize dokunmayı güvenli yapmaz.

**Faz ve nötr:** prizin iki deliğinden biri toprağa göre 230 V'tadır (faz), öteki yaklaşık 0 V'tadır (nötr). Yerde duran biri faza dokunursa döngü toprak üzerinden tamamlanır; kuşun durumu farklıdır, çünkü kuş toprağa bağlı değildir. **Eşik merdiveni:** 10 mA kaslar kasılır · 30 mA solunum güçleşir, koruma cihazının sınırı · 50 mA ve üzeri kalp ritmi bozulabilir.

**İki ek örnek:** teldeki kuşun iki ayağı arasında gerilim farkı yoktur (10.000 − 10.000 = 0); ama yerde duran bir insan için tel ile toprak arasındaki fark ölümcüldür. Kapı kolunda hissedilen statik elektrik birkaç bin volttur ama yük miktarı ve süresi çok küçüktür.

**Sınıfa soru:** Öldüren voltaj mı, akım mı? **Cevap:** Vücuda zarar veren içinden geçen akımdır; o akımı yaratan gerilimdir. İkisi birbirinden ayrılamaz: I = V ÷ R.

#### 29. Bizi koruyan mühendislik

**Sigorta (otomatik sigorta):** ısınınca eğilen bimetal şerit ve ani büyük akımda çalışan bir elektromıknatıs bobini içerir. Prizler için genellikle 16 A'lik sigortalar kullanılır. Görseldeki üç cihaz: 2.000 W ÷ 230 V ≈ 8,7 A, 1.200 W ÷ 230 V ≈ 5,2 A, 2.400 W ÷ 230 V ≈ 10,4 A. Toplam 8,7 + 5,2 + 10,4 = 24,3 A; 16 A'i aştığı için sigorta atar. Gerçekte bu kadar akımda atması dakikalar sürebilir; görsel hızlandırılmıştır.

**Kaçak akım rölesi:** faz ve nötr iletkenleri aynı halkadan geçer; normalde iki iletkendeki akım eşit büyüklükte ve zıt yönlüdür (biri gider, biri döner); bu yüzden halkadaki manyetik etkileri birbirini yok eder. Akımın bir kısmı başka yoldan (örneğin bir insandan) toprağa kaçarsa fark oluşur, röle saniyenin küçük bir kesrinde devreyi keser. 30 mA hayat koruma seviyesidir.

**Topraklama:** prizdeki üçüncü bağlantı; bizim prizlerimizde iki deliğin iki yanındaki metal kontaklardır, fişte de bunlara değen metal şeritler bulunur. Çamaşır makinesi, buzdolabı gibi metal gövdeli cihazlarda hayati önemdedir.

### 2 · Devre

#### 30. Elektrik bir döngü ister

**Döngü:** pil yükleri yaratmaz; yalnızca onları iter. Yükler dış devreyi dolaşıp pile geri dönmelidir. Yol bir yerden koparsa (anahtar açık, kopuk kablo) akım her yerde aynı anda durur.

**Akım yönü:** 18. yüzyılda Benjamin Franklin akımı artıdan eksiye akan bir şey olarak tanımladı. Elektron 1897'de keşfedildiğinde eksiden artıya hareket ettiği anlaşıldı ama gelenek değişmedi. Şemalarda okun yönü bu uzlaşımdır.

**Sınıfa soru:** Kuş tele konduğunda neden devre oluşmaz? **Cevap:** Kuşun içinden geçecek bir dönüş yolu ve gerilim farkı yoktur: iki ayağı da aynı teldedir (10.000 − 10.000 = 0). Yerde duran bir insan tele dokunursa döngü vücudu ve toprak üzerinden tamamlanır; bu ölümcüldür.

**Kısa devre güvenliği:** Görseldeki kısa devre yalnızca ekranda gösterilir. Gerçekte bir pilin iki ucunu tel ya da metal bir nesneyle (anahtar, bozuk para) birleştirmek tel ve pili ısıtır; yanık ve yangın tehlikesi vardır.

#### 31. Devre şemasının dili

**Semboller:** pil (uzun çizgi artı, kısa çizgi eksi), direnç (dikdörtgen ya da zikzak), LED (üçgen ve çizgi, dışarı çıkan iki ok), diyot (üçgen ve çizgi: okun yönü akımın geçebildiği yön), anahtar (açılan bir çizgi), lamba (daire içinde çarpı).

Görselin sonunda semboller birleşip kapalı bir devre oluşturur: pil → anahtar → direnç → LED → pil. Birazdan bu devreyi gerçekten kuracağız.

**Yön:** Mavi noktalar elektronlardır ve LED sembolündeki üçgenin tersine, eksiden artıya ilerler. Üçgen, artıdan eksiye çizilen geleneksel akım yönünü gösterir (Akım nedir? slaytı). İkisi aynı olayı iki farklı anlaşmayla anlatır. Direnç sembolünün dikdörtgen (IEC) ve zikzak (ANSI) biçimleri vardır.

#### 32. Direnci yakından tanıyalım

**Okuma:** kırmızı (2), kırmızı (2), kahverengi (×10) → 22 × 10 = 220 Ω. Kahverengi, siyah, kırmızı → 10 × 100 = 1.000 Ω = 1 kΩ.

**İçi:** seramik bir çubuğun üzerine ince bir karbon ya da metal film kaplanır; bu filme lazerle spiral bir kesik açılır. Kesik ne kadar uzunsa akımın yolu o kadar uzar ve direnç büyür. Üstü boya ile kaplanır.

**Hazır değerler:** dirençler her sayıda üretilmez: 100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820 Ω gibi sıralı değerler vardır; hesapladığımız değer arada kalırsa bir üst değeri seçeriz.

**Spiral kesik:** içteki kesik direncin değerini ayarlar; “İçi” düğmesiyle gösterin.

**Hafıza:** 2'den 7'ye kadar renkler gökkuşağı sırasıyla gider: kırmızı 2, turuncu 3, sarı 4, yeşil 5, mavi 6, mor 7. Öncesinde siyah 0 ve kahverengi 1, sonrasında gri 8 ve beyaz 9 gelir. Asıl önemli olan, üçüncü halkanın bir çarpan olduğunu ve değerin çarpma işlemiyle okunduğunu anlamaktır.

#### 33. Kondansatör

**Kondansatör nedir?** Kısa süreliğine yük biriktiren küçük bir depodur. İki iletken plaka, aralarında yalıtkan. Pile bağlanınca pilin gerilimi elektronları bir plakaya iter, öbüründen çeker; plakalar arasında bir elektrik alanı oluşur. Pil çıkarılırsa yük plakalarda kalır. Bir lamba bağlanırsa elektronlar lamba üzerinden geri akar ve lamba kısa süre yanar.

**Hesap:** yük = kapasite × gerilim. 1 mF × 9 V = 9 mC. Büyük kapasite ya da büyük direnç dolumu yavaşlatır. Görseldeki süreler ders için hızlandırılmıştır.

**Neden pilden farklı?** Pil kimyasal enerji depolar ve uzun süre, neredeyse sabit gerilimle verir. Kondansatör enerjiyi elektrik alanında depolar; çok hızlı dolar ve boşalır ama az enerji tutar.

**Günlük hayat:** şarj aletinde diyotların çıkardığı dalgalı akımı düzeltir (Birimler slaytındaki “İç yapısı”). RAM'de her bit minik bir kondansatördür: yüklüyse 1, boşsa 0; yük sızdığı için sürekli tazelenir. Kapasitif dokunmatik ekranda parmak, plaka gibi davranıp alanı değiştirir.

**Güvenlik:** büyük kondansatörler fiş çekildikten sonra da yük tutabilir; bu yüzden şarj aletleri ve cihazlar açılmaz.

**Sınıfa soru:** Plakalar arasında yalıtkan varken akım nasıl “geçiyor” gibi görünür? **Cevap:** Elektronlar yalıtkandan geçmez. Bir plakaya elektron girer, öbüründen çıkar; dış devrede akım vardır, yalıtkanın içinde ise yoktur. Plakalar dolunca akım durur.

#### 34. Yarı iletken nedir?

**Silisyum** 4 değerlik elektronuna sahiptir ve her komşusuyla bir elektron çifti paylaşır. Saf silisyumda oda sıcaklığında çok az elektron bağından kopar.

**n tipi:** 5 değerlik elektronlu fosfor eklenir; dört elektron bağ kurar, beşincisi serbest kalır. **p tipi:** 3 değerlik elektronlu bor eklenir; bir bağ eksik kalır. Bu eksikliğe boşluk (hol) denir ve artı yük gibi davranır: komşu elektron boşluğa atladıkça boşluk ters yöne ilerler.

n ve p tipi silisyumu birleştirdiğimizde diyot ve transistör doğar. LED de aynı p–n fikriyle çalışır; ama ışık verebilmesi için silisyumdan değil, galyum içeren yarı iletkenlerden yapılır.

#### 35. Diyot

**Engel bölgesi:** sınırın yakınında n tarafındaki serbest elektronlar p tarafındaki boşlukları doldurur. Geride hareket edemeyen yüklü atomlar kalır ve yaklaşık 0,6–0,7 V'luk bir engel oluşur (silisyum). Katkılı silisyumun bütünü yüksüzdür: p'deki eksi yük hareketsiz bor atomlarında, n'deki artı yük fosfor atomlarındadır; “p” ve “n” adları hareketli taşıyıcıyı (boşluk, elektron) anlatır.

**İleri yön:** dışarıdan bu engelden büyük gerilim uygulanınca taşıyıcılar sınırı aşar, akım hızla artar (sağ üstteki eğri). **Ters yön:** engel genişler, neredeyse hiç akım geçmez.

**Şarj aletindeki dört diyot (köprü doğrultucu):** dört diyot bir kare biçiminde bağlanır. Prizdeki akım bir yöne akarken iki diyot, ters yöne akarken diğer iki diyot iletir; her iki durumda da çıkıştaki akım aynı yönde kalır. Böylece saniyede 100 kez yön değiştiren akım tek yönlü, dalgalı bir akıma dönüşür. Ardından bir kondansatör dalgalanmayı düzeltir. Birimler slaytında verdiğimiz sözün cevabı budur.

**Neden direnç?** Engel aşılınca diyotun kendi direnci çok küçüktür; akımı sınırlayan bir direnç koymazsak akım hızla büyür. LED'in yanına direnç bu yüzden konur.

**Sınıfa soru:** Bir LED'i ters takarsak neden yanmaz? **Cevap:** LED de bir diyottur; ters yönde akım geçmez.

#### 36. LED nasıl ışık saçar?

**Renk:** enerji aralığı büyüdükçe ışık kırmızıdan maviye kayar. **Beyaz LED:** mavi LED ile sarı ışık veren bir kaplamanın birleşimidir. **2014:** mavi LED'i geliştiren Isamu Akasaki, Hiroshi Amano ve Shuji Nakamura Nobel Fizik Ödülü aldı; beyaz LED aydınlatma bu buluşla mümkün oldu.

**Işığın kaynağı:** n tarafından gelen elektronlar sınırda p tarafındaki boşluklarla birleşir. Sağdaki çizim enerji düzeylerini gösterir: serbestçe dolaşabilen elektronlar üstteki iletim bandında, bağlardaki elektronlar ve boşluklar alttaki değerlik bandındadır. İki bant arasındaki fark enerji aralığıdır (yasak enerji aralığı); kırmızı için 1240 ÷ 630 ≈ 1,97 eV. Elektron boşluğa düşünce bu farkı bir foton olarak verir.

**Doğanın bölme işlemi:** fotonun enerjisi (elektronvolt) ≈ 1240 ÷ dalga boyu (nanometre). Kırmızı 630 nm → 1240 ÷ 630 ≈ 2,0 eV. Bu yüzden kırmızı LED en az yaklaşık 2 V ister; mavi LED (465 nm, 2,7 eV) pratikte yaklaşık 3 V ister.

**Malzeme:** kırmızı için AlGaInP, yeşil ve mavi için InGaN. Silisyumda birleşme enerjisi neredeyse tamamen ısıya dönüşür; ışık çıksa bile enerji aralığı yalnızca 1,12 eV olduğundan 1240 ÷ 1,12 ≈ 1.100 nm, yani gözün göremediği kızılötesi olurdu. Bu yüzden LED'ler başka yarı iletkenlerden yapılır.

**Sınıfa soru:** Neden LED'ler akkor ampule göre çok az ısınır? **Cevap:** Enerjiyi doğrudan ışığa çevirir; akkor ampul önce teli ısıtır.

#### 37. LED'i yakından tanıyalım

**Parçalar:** katot bacağının ucundaki çanağa (yansıtıcı) yarı iletken çip yapıştırılır. Çipin üstü, anot bacağına incecik bir altın telle bağlanır. Hepsi şeffaf epoksi içine dökülür; kubbe biçimi ışığı yönlendirir.

**Sınıfa soru:** Bacakları kesilmiş bir LED'in hangi tarafının katot olduğunu nasıl anlarız? **Cevap:** Gövdenin düz kenarına ya da içteki büyük çanağa bakarak.

#### 38. Seri ve paralel

**Seri:** tek yol. Aynı akım bütün parçalardan geçer; gerilim paylaşılır (4,5 V + 4,5 V = 9 V). Biri koparsa hepsi söner. Seride her lamba yarı gerilim ve yarı akım alır: güç ½ × ½ = ¼. Bu yüzden sönük yanar. Toplam direnç: 450 Ω + 450 Ω = 900 Ω; akım 9 ÷ 900 = 0,01 A, her lamba 4,5 V alır.

**Paralel:** ayrı kollar. Her kol pilin tam gerilimini alır; kollardaki akımlar toplanır (I = I₁ + I₂). Biri koparsa diğerleri çalışmaya devam eder. Her kol 9 V alır: 9 ÷ 450 = 0,02 A; iki kol 0,02 + 0,02 = 0,04 A. Toplam akım arttı: toplam direnç 225 Ω'a düştü.

**Sınıfa soru:** Evde buzdolabı bozulunca neden televizyon da kapanmaz? **Cevap:** Prizler paralel bağlıdır; her biri ayrı bir koldur.

#### 39. İlk devremizi kuralım

**Breadboard:** lehimsiz deney tahtası. Ortadaki her 5'li sıra içeriden metal bir kıskaçla bağlıdır; kenardaki uzun hatlar artı ve eksi beslemedir.

**Hesap:** LED yaklaşık 2 V ister; 9 V'luk pilde geri kalan 7 V direncin üzerinde düşmelidir. LED'den 20 mA geçsin istiyoruz: R = 7 V ÷ 0,02 A = 350 Ω. Dirençler belirli standart değerlerde üretilir: 350 Ω'a en yakınları 330 Ω ve 390 Ω'dur. 330 Ω daha yakındır ama akımı 7 V ÷ 330 Ω ≈ 0,021 A = 21 mA yapar ve 20 mA sınırını aşar. Bu yüzden bir üst değer olan 390 Ω'u seçeriz: I = 7 V ÷ 390 Ω ≈ 0,018 A = 18 mA. Kural: direnç seçerken her zaman bir üst değere yuvarlanır.

**Denemeler (yalnızca görselde):** LED'i ters takın: diyot geçirmez, yanmaz. Direnci çıkarın: akım çok büyür, LED bozulur. Bunlar gerçekte de aynen böyle olur; bu yüzden direnç her zaman takılır.

#### 40. Transistör

**MOSFET** (metal–oksit–yarı iletken alan etkili transistör): kaynak (S) ve akaç (D) adlı iki n tipi bölge, p tipi silisyum tabanın içindedir; aralarında akım geçemez. Kapı (G), silisyumdan çok ince bir silisyum dioksit (SiO₂, camın da ana maddesi) tabakasıyla yalıtılmıştır. Kapıya artı gerilim verilince kapıdaki artı yük, oksidin hemen altındaki boşlukları aşağı iter ve elektronları oraya çeker. Bu elektronlar iki n bölgesini birleştiren ince bir kanal oluşturur: anahtar kapanır, akım geçer.

**Neden önemli?** Küçük bir gerilim büyük bir akımı kontrol eder ve bu anahtar saniyede milyarlarca kez açılıp kapanabilir. Bilgisayarın 1 ve 0'ları budur.

**Kapı:** ince bir yalıtkan tabakayla kanaldan ayrılmıştır; kapıdan akım geçmez, yalnızca elektrik alanıyla kanalı açar. Kapıya 3,3 V verince LED yanar, 0 V verince söner.

**Mucitler:** ilk transistör (1947): John Bardeen, Walter Brattain ve William Shockley; 1956 Nobel Fizik Ödülü. Görseldeki MOSFET'i 1959'da Mohamed Atalla ve Dawon Kahng geliştirdi; bugünkü çiplerdeki transistörlerin neredeyse hepsi bu türdendir.

**1 ve 0:** bu derste 1 = akım geçiyor (anahtar kapalı, kanal var), 0 = akım geçmiyor (kanal yok).

### 3 · PCB

#### 41. Breadboard'dan PCB'ye

**Neden PCB?** Breadboard denemek için harikadır ama kablolar gevşer, devre çok yer kaplar ve her seferinde elle kurulur. PCB'de kabloların yerini bakır yollar alır; parçalar lehimlenir. Kart küçük ve sağlamdır; fabrikada birebir aynısından binlercesi üretilebilir.

**Sınıfa soru:** Evinizdeki hangi cihazlarda PCB vardır? **Cevap:** Neredeyse hepsinde: telefon, kumanda, çamaşır makinesi, oyuncaklar, şarj aleti.

#### 42. PCB'nin katmanları

**Malzeme:** çekirdek FR-4 adlı, epoksiyle sertleştirilmiş cam elyafı bir levhadır; yalıtkandır. Üzerindeki bakır yaklaşık 35 µm kalınlığındadır.

**Üretim:** bakırın istenmeyen kısımları kimyasal olarak aşındırılır ve geriye yollar kalır. Delikler delinir, iç yüzeyleri bakırla kaplanır (via). Üstüne yeşil lehim maskesi ve beyaz yazılar (serigrafi: parçaların adları ve yerleri) basılır.

**Sınıfa soru:** Kart neden çoğunlukla yeşildir? **Cevap:** Rengi veren lehim maskesidir; yeşil gelenekseldir ve üretimde kontrolü kolaylaştırır. Mavi, kırmızı ya da siyah kartlar da vardır.

#### 43. GND nedir?

**Konu:** Bu derslerde gerilimi pilin iki ucu arasındaki fark olarak gördük. Aynı mantık devrenin her yerinde geçerlidir: gerilim her zaman iki nokta arasındaki farktır. Tek bir noktanın “gerilimi” demek, hangi noktaya göre olduğunu söylemeden eksiktir. Bu yüzden devrede bir noktayı “sıfır volt” diye seçeriz ve ona GND (ground, devre toprağı) deriz. Öbür noktaların gerilimi, GND'ye göre ölçülen değerdir.

**Görseli okuma:** 9 V'luk pil ve eşit iki direnç (R1 ve R2, 1.000 Ω) bir döngü oluşturur. A pilin artı ucu, B iki direncin arası, C pilin eksi ucudur. Akım: 9 V ÷ (1.000 Ω + 1.000 Ω) = 4,5 mA. Her direncin üzerinde 4,5 mA × 1.000 Ω = 4,5 V düşer. Turuncu noktalar akımın geleneksel yönünü (artıdan eksiye) gösterir. “GND = C” seçilirse A 9 V, B 4,5 V, C 0 V olur. “GND = B” seçilirse A +4,5 V, B 0 V, C −4,5 V olur. “GND = A” seçilirse A 0 V, B −4,5 V, C −9 V olur. Altta turuncu kutulardaki değerler (R1 üzerinde 4,5 V, R2 üzerinde 4,5 V, akım 4,5 mA) hiçbir seçimde değişmez; çünkü iki noktanın farkı, sıfırı nereye koyduğumuzdan bağımsızdır.

**Deniz seviyesi benzetmesi:** Bir dağın yüksekliğini “1.000 metre” diye söylerken aslında “deniz seviyesinden 1.000 metre yukarıda” demek isteriz. İki zirve arasındaki fark ise sıfırı nereye koyarsak koyalım aynıdır. Gerilimde deniz seviyesinin karşılığı GND'dir. Sağ üstteki küçük kutuda A, B, C üç basamaktır; sıfır çizgisini (denizi) başka basamağa taşıyınca basamakların sayıları değişir, aralarındaki yükseklik farkı değişmez. GND'nin altında kalan noktalar eksi gerilimdedir, tıpkı deniz seviyesinin altındaki bir çukur gibi.

**Neden referans gerekir?** Voltmetrenin iki ucu vardır; biri GND'ye, biri ölçülen noktaya dokunur. Tek bir uçla gerilim ölçülemez, çünkü gerilim bir fark ve tek noktada fark yoktur. Görselde siyah uç hep GND'dedir, kırmızı uç sırayla öbür noktalara gider. Kırmızı uç artı ucun tarafındaysa ekranda artı, eksi ucun tarafındaysa eksi sayı görürüz.

**Kart üzerindeki 3,3 V:** Bir kartta “3,3 V” yazan noktanın anlamı, o noktanın GND'ye göre 3,3 V yüksekte olduğudur. ESP32 gibi bir işlemcinin 1 olarak gördüğü seviye, GND'ye göre yaklaşık 3,3 V'tur; 0 ise GND'ye çok yakın (yaklaşık 0 V) seviyedir. Kartta her parça aynı GND'yi paylaşır; böylece hepsi aynı sıfır noktasına göre konuşur. Sonraki slaytlarda bu ortak noktanın kart üzerinde bakır bir katman olduğunu göreceğiz.

**Pilli cihazlarda GND:** Pilli bir cihazda GND, pilin eksi ucuna verdiğimiz addır; bu gelenektir. Toprağa (yere) bağlı değildir. Böyle bir devre “yüzer” (toprağa göre serbest). Görselde “Toprağa bağlı” düğmesiyle GND'den yere bir tel çizilir: bu telden akım geçmez (0 mA), çünkü akımın dönebileceği kapalı bir yol yoktur. Akım ve bütün gerilimler aynı kalır. Bunu gerçekte denemeye gerek yoktur; toprak bağlantısı bu devrenin hiçbir değerini değiştirmez.

**Türkçede “toprak” iki ayrı fikir:** (1) Devre toprağı (GND): devrede sıfır volt seçtiğimiz referans ve akımın pile geri döndüğü ortak yol. (2) Koruma topraklaması (PE): binada toprağa gömülü bir iletkene giden güvenlik hattı; fişteki toprak ucu. Alttaki şeritte üç sembol vardır: devre toprağı/GND, şasi (cihazın metal gövdesi) ve koruma topraklaması. Bu semboller çoğu zaman benzer çizilir, hangisi olduğu yanındaki etiketten ve devrenin türünden anlaşılır. Şebekeden beslenen cihazlarda (2) ve (1) bazen birbirine bağlanır; pilli cihazlarda bağlanmaz. Bir sonraki slayt gerçek toprağı anlatıyor: “Evdeki toprak gerçekten toprak mı?”.

**Güvenlik:** Burada yalnızca 9 V'luk pil modeli konuşulur. Prize, şarj aletine ya da şebekeye bağlı hiçbir devrede GND'ye, toprağa veya bir metal parçaya dokunarak ölçüm yapılmaz; pilin uçlarını birbirine bağlamak de gerçekte denenmez.

**Sınıfa soru:** Pil takılı bir telefonu elinize aldığınızda telefon toprağa bağlı mı? **Cevap:** Hayır. Telefonun GND'si pilin eksi ucuna bağlı ortak bir bakır yoldur; yere giden bir teli yoktur. Elinizle yere bir yol olsa bile, devre kapalı bir döngü oluşturmadığı için o yoldan akım akmaz; tıpkı görseldeki 0 mA'lık tel gibi. Telefon “yüzer” bir devredir.

**Sınıfa soru:** GND'yi B noktasına taşıdık; R1 üzerindeki gerilim değişti mi? **Cevap:** Değişmedi, 4,5 V. A 4,5 V, B 0 V; fark yine 4,5 V. Değişen yalnızca “sıfırı nereye koyduğumuz”.

#### 44. Evdeki toprak

**Önceki slayta bağ:** GND slaytında gerilimin hep bir referansa göre ölçüldüğünü, referansa “0 V” dediğimizi gördük. Türkçede “toprak” sözü iki ayrı şey için kullanılır: devre toprağı (GND, referans ve dönüş yolu) ve koruma topraklaması (priz ve metal gövdelerin gerçek toprağa bağlanması). Bu slayt ikincisini anlatıyor.

**Prizdeki toprak teli nedir?** Türkiye'deki Schuko prizlerde iki yuvarlak delik faz ve nötr içindir; prizin iki yanındaki metal kıskaçlar (yan kontaklar) toprak bağlantısıdır. Bu kontaklardan çıkan yeşil-sarı renkli tele PE (koruma iletkeni) denir. PE teli, binanın altına gömülü bir bakır çubuğa, bakır levhaya ya da temelin demirlerine bağlanır.

**Gerçekten toprağa mı bağlı?** Evet. Çubuk ya da levha nemli toprağın içindedir; bakırla toprak arasındaki bağlantının bir direnci vardır (görselde R). Bu direnç mümkün olduğunca küçük tutulur; ne kadar küçük gerektiğini yönetmelikler ve bina tesisatı belirler, sınıfta bir sayı vermeye gerek yok. Not: bazı şebeke düzenlerinde (TT, TN gibi adlarla anılır) toprağın arıza akımına ne kadar katıldığı değişir; kimi yerde dönüş yolunun büyük kısmı bina içindeki bir bağlantıdan geçer. Slayttaki sade model, akımın toprak üzerinden döndüğü durumu gösterir.

**Normal çalışma:** Çamaşır makinesi faz ve nötr telinden çalışır. Şebeke akımı alternatiftir, yani elektronlar ileri geri titreşir (görselde bu yüzden noktalar gidip gelir). Toprak telinden akım geçmez, metal gövde yaklaşık 0 V'ta kalır.

**Arızada ne olur?** Bir kablonun yalıtımı yıpranıp faz teli metal gövdeye değdiğini düşünelim. Toprak teli yoksa gövde faz gerilimine yakın bir gerilimde kalır ve dokunan kişiden akım geçebilir. Toprak teli varsa faz teli, gövde, PE teli yoluyla düşük dirençli bir yol bulur; çok büyük bir akım akar, sigorta ya da kaçak akım rölesi devreyi keser. Bu sırada gövde ile yer arasındaki gerilim küçük kalır, dokunan kişi güvendedir. Görseldeki süreler sembolik ve hızlandırılmıştır; gerçekte bu olay çok kısa sürer. **Güvenlik:** bu hiçbir zaman denenmez; prizlere, kablolara, topraklamaya dokunulmaz, makineler açılmaz.

**Neden toprak seçildi?** (1) Her yerde vardır. (2) Çok büyüktür; yük içinde yayılır ve potansiyeli neredeyse değişmez, bu yüzden iyi bir ortak referanstır. (3) Nemli toprak iletir; çünkü suyun içinde iyonlar vardır. (4) Tarihsel: 19. yüzyılda telgraf hatlarında dönüş teli yerine toprak kullanılırdı. Ortak referans, birbirine dokunabilecek metal parçalar arasında tehlikeli gerilim farkı oluşmasını da engeller.

**Trafo tarafı:** Mahalledeki dağıtım trafosunun ikincil sargısında nötr noktası da toprağa bağlanır (görselde direğin yanındaki çubuk). Yani toprak, şebekenin de referansının bir parçasıdır. Nötr tel toprak gibi davranır ama aynı şey değildir: nötr, çalışma akımını taşıyan bir iletkendir ve gerilim altındaki sistemin parçasıdır; PE ise normalde akım taşımaz.

**Yıldırım:** Benjamin Franklin 1750'li yıllarda paratoneri (yıldırımsavar) önerdi: çatıdaki sivri metal çubuk, yıldırım yükünü kalın bir iletkenle toprağa indirir. Toprak bu yükü her yöne yayar ve yutar; çok büyük olduğu için potansiyeli neredeyse değişmez. Yıldırım sırasında dışarıda durulmaz, bu bir gösteri değil bilgidir.

**GND ile farkı:** Pille çalışan bir telefonda ya da el fenerinde “GND”, pilin eksi tarafıdır. Bu devre toprağı gezegene bağlı değildir (“yüzer”). Prizden çalışan bir cihazda ise çoğu zaman devre toprağı ile koruma toprağı bir noktada birleştirilir; ama bu bir zorunluluk değil, tasarım seçimidir. Özetle: GND bir referans ve dönüş yoludur, toprak (PE) bir güvenlik bağlantısıdır; aynı kelimeyle anılsalar da ayrı işleri vardır.

**Sonraki slayta bağ:** Devre kartlarının içinde de büyük bir bakır katman GND'ye bağlanır: PCB'deki toprak katmanı. Orada akımın dönüş yolunu ve neden “toprak düzlemi” denildiğini göreceğiz.

**Sınıfa soru:** Bir fenerin içindeki pilli devrenin GND'si toprağa bağlı mıdır? Prizden çalışan çamaşır makinesinin metal gövdesi? **Cevap:** Fenerin GND'si yalnızca pilin eksi ucudur, toprağa bağlı değildir. Çamaşır makinesinin metal gövdesi ise PE teli aracılığıyla gerçek toprağa bağlıdır; böylece bir arıza olsa bile gövde tehlikeli bir gerilimde kalmaz.

#### 45. PCB'deki toprak katmanı

**Konu:** Önceki iki slaytta GND'yi "sıfır dediğimiz nokta" olarak, toprağı da evdeki koruma bağlantısı olarak gördük. Bu slayt, GND'nin gerçek bir kartın içinde nasıl göründüğünü gösterir: kartın ortasında, baştan sona tek parça bakır olan bir katman. Bu katmana "toprak katmanı" ya da İngilizce "ground plane" denir. Slayttaki karttaki katmanlar "PCB'nin katmanları" slaydındaki ile aynıdır: üstte parçalar ve yollar, içeride bakır katmanlar, altta yine yollar.

**Katmanlar düğmesi:** Katmanlar birbirinden ayrılmış gösterilir. Üstte bileşenler (siyah çip, küçük direnç) ve bir sinyal yolu var. Ortadaki turuncu levha GND katmanıdır: delikli ya da şeritli değil, neredeyse bütün kartı kaplayan tek parça bakır. Altta ikinci bir yol katmanı var. Katmanların arasında yalıtkan FR-4 (cam elyaf ve reçine) bulunur. Gerçek bakır tabakası yalnızca yaklaşık 35 µm kalındır; yani bir saç telinin yarısından da ince. Slaytta kalınlıklar ve aralıklar okunsun diye çok büyütüldü, bu yüzden "ölçekli değil" yazıyor.

**Dönüş yolu düğmesi:** Akım hep bir halka çizmek zorundadır. Pilden çıkıp parçaya giden akım, parçadan sonra mutlaka pile geri dönmelidir; halka kapanmazsa akım akmaz (devre ve akım halkası konuları). Üstteki mavi noktalar gidişi, GND katmanındaki bakır renkli noktalar dönüşü gösterir. Bileşenin GND ayağı, via denilen içi bakır kaplı delikle aşağıdaki katmana bağlanır. Hızlı değişen sinyallerde dönüş akımı katmanın içinde rastgele dağılmaz; gidiş yolunun hemen altından, onu izleyerek geri döner, çünkü akım için en kolay yol en küçük halkayı çizen yoldur. Ekrandaki ince kapalı çizgi bu halkadır. Yavaş (doğru akım) durumunda dönüş akımı katmanın geniş bir bölgesine yayılır; yani "hemen altından" ifadesi hızlı sinyaller için geçerlidir. Bu bilgi öğrenciler için ayrıntıdır, soru gelirse söylenebilir.

**Ortak sıfır düğmesi:** Üç parçanın her birinin GND ayağı bir via ile aynı bakır katmana bağlıdır. Her parçanın 3,3 V ucu ile GND arasına voltmetre koyduğumuzda üçü de 3,3 V gösterir; çünkü hepsi gerilimi aynı sıfır noktasına göre ölçer (3,3 V − 0 V = 3,3 V). Eski "GND nedir" slaydındaki deniz seviyesi benzetmesi burada geçerli: yükseklikleri hep aynı deniz seviyesinden ölçüyoruz. Her parça kendi GND teline sahip olsaydı bu teller uzun, ince ve farklı dirençli olurdu; sıfır noktası parçadan parçaya kayardı. Tek katman bunu çözer.

**Gürültü düğmesi:** İki durum art arda gösterilir. Katman yoksa dönüş teli kartın etrafından uzun bir yol izler ve büyük bir halka oluşur. Halka büyükse çevreden gelen elektromanyetik gürültüyü (telefon, motor, Wi-Fi gibi kaynaklar) yakalar ve devrenin kendi hızlı sinyalleri de çevreye gürültü yayar. Katman varsa dönüş yolun hemen altından gider, halka çok küçük olur; hem yakalama hem yayma azalır. Küçük halka, GND katmanının en önemli faydasıdır.

**Katmanın diğer faydaları:** (1) Ortak sıfır noktası. (2) Çok düşük direnç: geniş ve kalın bakır, ince bir telden çok daha az dirençlidir, bu yüzden üzerinde gerilim kaybı ve ısınma ihmal edilebilir. (3) Kalkan: üst ve alt katmandaki yolları birbirinden ayırır; yollar arası karışmayı azaltır. (4) Isı dağıtma: sıcak bir çipin ısısı geniş bakıra yayılır.

**Önemli:** Pille çalışan cihazlardaki (telefon, saat, kumanda, Deneyap kartı) toprak katmanı gerçek toprağa bağlı değildir. Bu, önceki slaytta konuştuğumuz iki ayrı "toprak" fikrinden devre toprağıdır (GND): referans ve dönüş yolu. Evdeki koruma topraklaması (yeşil-sarı kablo) ayrı bir güvenlik bağlantısıdır. Fiş prizli bazı cihazlarda (bilgisayar kasası gibi) bu ikisi bilinçli olarak birleştirilebilir; pilli cihazlarda birleşmez.

**Sınıfa soru:** Telefonun içinde toprak katmanı toprağa mı bağlı? **Cevap:** Hayır. Telefon pille çalışır ve yere ayrı bir bağlantısı yoktur. Katman yalnızca telefonun kendi sıfır noktasıdır: pilin eksi ucuyla aynı noktadır. Telefonu yere bırakmak ya da elimize almak bu katmanı değiştirmez.

**Öğrencilerin aklına gelebilecek sorular:** "Katman neden bakır?" Bakır çok iyi bir iletkendir ve kartın yolları zaten bakırdan yapılır; bir katmanı yol çizmek yerine tümüyle bakır bırakmak yeterlidir. "Via ne işe yarar?" Üstteki parçanın GND ayağını katmana en kısa yoldan bağlar; ayak ile katman arasına uzun yol yerine kısa bir bakır boru girer. "Her şeyi GND'ye neden bağlıyoruz?" Hepsi aynı sıfırdan ölçsün ve akım dönebilsin diye. "Akım pile ya da şarj aletine nereden döner?" Katmandan, kartın güç girişindeki GND bağlantısına ve oradan pilin eksi ucuna ya da USB kablosunun GND teline.

**Gerçekte denenmez:** Slayttaki hiçbir şey denenecek bir deney değildir; kartın kenarlarına, özellikle şarj olan ya da şişmiş pillere, bakır yüzeylere bir telle dokunarak kısa devre yapılmaz.

**Bağlantı:** Geri: "GND nedir?" ve "Evdeki toprak gerçekten toprak mı?" slaytları. İleri: bir sonraki slaytta USB-C kablosunun içine bakacağız; kablodaki GND telleri kartın bu toprak katmanına ulaşır, VBUS teli de pilin ya da şarj aletinin artı ucundan gelen 5 V'u getirir.

#### 46. USB-C kablosunun içinde ne var?

**Konu:** Önceki slaytta GND'nin "sıfır dediğimiz nokta" olduğunu ve kartın içinde bütün bir bakır katman olarak durduğunu gördük. Şimdi aynı fikri kartın dışına taşıyoruz: bir USB-C kablosunun içinde kimin ne işe yaradığına bakıyoruz. Slayt dört durak arasında yaklaşır: Kablo, Kesit, Konnektör, Pin. Düğmelerle istenen durağa gidilir; hiçbirine basılmazsa sunum kendiliğinden dört durağı sırayla gezer ve başa döner. Sağ üstteki dört nokta hangi durakta olduğumuzu, sol üstteki kutu o durağın adını ve yaklaşık boyutunu gösterir. Görsel kılavuz çizim gibi basitleştirilmiştir ("ölçekli değil · basitleştirilmiş model"); bu yüzden teller ve fiş gerçeğinden kat kat büyük, oranlar da yaklaşık çizilmiştir.

**Kablo durağı:** Bir şarj adaptörü ile bir geliştirme kartını bağlayan tipik bir USB-C kablosu. Kablonun dışı düz bir plastik boru gibi görünür, ama içinde birkaç ince tel vardır. Turuncu halka, bir sonraki adımda yaklaşacağımız kesit düzlemini gösterir. Bu bir çizim: gerçek bir kabloyu kesmek zorunda değiliz.

**Kesit durağı:** Kablo bir noktadan enine kesilmiş gibi gösterilir. Dıştan içe: (1) dış kılıf, yalıtkan plastik koruma. (2) Örgülü blendaj: ince metal tellerden örülmüş zırh; dışarıdan gelen elektriksel gürültüyü (telefon, motor, Wi-Fi gibi kaynakları) içerideki tellerden uzak tutar. (3) Drain teli: blendaja değen çıplak ince tel; blendajı GND'ye bağlayan yoldur. (4) Kalın kırmızı tel VBUS: 5 V'luk artı taraf, akımın cihaza gidiş yolu. (5) Kalın siyah tel GND: 0 V, yani referans; akımın kaynağa döndüğü yol. Gidiş ve dönüş birlikte bir halka kurar; akım hep bir halka çizmek zorundadır (devre ve akım halkası konuları). Teller kalındır çünkü şarj akımı büyüktür; ince telin direnci yüksek olur, hem ısınır hem de gerilim kaybeder. (6) Yeşil D+ ve beyaz D− telleri birbirine bükülmüş tek çift olarak veri taşır. İki tel zıt işaretli gerilimler taşır ve alıcı yalnızca ikisinin farkına (D+ − D−) bakar. Dışarıdan gelen gürültü iki tele aynı miktarda bindiği için fark alınınca silinir; bükmek de gürültünün iki tele eşit binmesini sağlar. Detayını bir sonraki slaytlarda göreceğiz. (7) İnce CC teli: kablonun hangi yönde takıldığını ve ne kadar güç verileceğini anlaştıran kontrol teli. (8) Gri çiftler: yüksek hızlı veri hatları; hepsi bir blendajla sarılıdır ve yalnızca bazı kablolarda bulunur. Çizimde kaç çift olduğuna takılmayın: kabloya göre değişir. Önemli: yalnızca şarj için yapılmış kablolarda sadece VBUS, GND ve CC bulunur; bu yüzden bazı kablolar ince, bazıları kalındır ve "şarj eder ama bilgisayarla veri alışverişi yapmaz" olabilir. Kırmızı ve siyahın sayısı da tipik bir kabloya göre çizilmiştir; bazı kablolarda daha fazla olabilir. Renkler de üreticiye göre değişebilir; bu slayttaki renkler bu derslerde anlaşmamız için seçilmiştir.

**Konnektör durağı:** Kablonun ucundaki fiş. Dışta metal kabuk, arkada plastik gövde ve kablo. Kabuğun içinde iki sıra kontak vardır: üstte 12, altta 12, toplam 24. Renkler gruplara göre: GND dört, VBUS dört, CC iki, D+ ve D− dört, SBU iki (yan bant uçları; bu derslerde ayrıntısına girmiyoruz), hızlı veri çiftleri sekiz kontak. Fiş ters takılsa da çalışır; çünkü iki sıra yarım tur çevrilince aynı uçları aynı yere getirecek şekilde dizilmiştir. Cihaz fişin hangi yönde takıldığını CC ucundan anlar (aşağıdaki Pin bölümünde). Bir süre sonra fiş yarım tur dönerek bunu gösterir; iki durumda da aynı renkli kontaklar aynı yerde görünür. Ayrıntı: gerçek fişte kontaklar kabuğun içindedir; çıkıntılı "dil" soketin (dişi tarafın) içinde durur. Ayrıca gerçek bir fişte iki CC ucundan yalnızca biri CC olarak, diğeri ise kabloya elektrik vermek için kullanılır (VCONN). Slaytta ikisi de CC rengiyle gösterilir; model basitleştirilmiştir.

**Pin durağı:** Kontaklardan yalnızca bir sıra gösteriliyor ve uçlar numaralanmış: A1 GND, A4 VBUS, A5 CC1, A6 D+, A7 D−, A12 GND. Kontaklar arası mesafe yaklaşık 0,5 mm'dir; çok küçük olduğu için çizim büyütülmüştür. Sağdaki voltmetre iki ucu şöyle bağlar: kırmızı uç VBUS'a (A4), siyah uç GND'ye (A1). Ekran 5 V gösterir: VBUS − GND = 5 V. Yani 5 V dediğimiz şey tek bir telin gerilimi değil, iki tel arasındaki farktır ve ölçü hep GND'ye göredir ("5 V, GND'ye göre ölçülür"). GND'nin tanımı: GND, devrenin sıfır volt referansıdır; akımın kaynağa döndüğü yoldur. Deniz seviyesi benzetmesini hatırlatın: yükseklikleri deniz seviyesinden ölçeriz, gerilimleri GND'den. VBUS'ın varsayılan değeri 5 V'tur; daha yüksek gerilimler ancak CC ucundan anlaşma yapıldıktan sonra verilir. Bu yüzden CC ucu "yönü ve gücü anlaşan tel" olarak anlatılmıştır.

**Geliştirme kartındaki USB-C:** Kartlarda (Deneyap Kart gibi) çoğunlukla 16 uçlu, yalnızca USB 2.0 destekleyen basit USB-C soketi bulunur: VBUS, GND, CC1, CC2, D+, D−, SBU ve kabuk uçları. CC1 ve CC2'nin her biri ile GND arasına 5,1 kΩ'luk bir direnç bağlıdır; şarj aleti bu direnci görünce karşısındaki cihazın standart bir cihaz olduğunu anlar ve 5 V verir. Bu direnç olmasa modern bir USB-C şarj aleti kabloya hiç gerilim vermeyebilir. Karta gelen 5 V iki yere gider: kartın üzerindeki regülatör bu 5 V'tan 3,3 V üretir (işlemci ve sensörler 3,3 V ile çalışır); D+ ve D− ise USB-seri çevirici çipe gider, o çip bilgisayarın USB dilini ESP32'nin sade seri hattına (TX ve RX) çevirir. Bu parçaları bir sonraki slaytta kartın üzerinde adım adım göreceğiz. Güç ve yüksek akım taşıyan bazı kablolarda fişin içine e-marker adlı küçük bir çip konur; kablonun ne kadar akım taşıyabileceğini bildirir. Kısaca bilsin, ayrıntısına girmeyelim.

**Sınıfa soru:** Neden bir USB kablosunda iki değil dört GND ucu var? **Cevap:** İki sebep var. Birincisi akım dönüşü: dört kontak paralel çalışınca akım aralarında bölünür, her kontak daha az akım taşır, ısınma ve gerilim kaybı azalır; ince bir kontaktan geçecek akım dört kontağa yayılır. İkincisi fiş ters takılabildiği için her iki sırada da GND'nin bulunması gerekir: her sırada iki GND ucu vardır (A1, A12 ve B1, B12).

**Öğrencilerin aklına gelebilecek sorular:** "GND teli neden ayrı bir tel, kablonun dışı ya da blendaj dönmüyor mu?" Akım dönüşü için GND teli vardır; blendaj dönüş yolu olarak tasarlanmamıştır, görevi gürültüyü tutmaktır. "Kablo kırmızı ve siyah olunca hangisi artı?" Kırmızı VBUS 5 V'tur, siyah GND 0 V'tur; renkler bu slayttaki anlaşmadır, bütün üreticiler aynı renkleri kullanmaz.

**Gerçekte denenmez:** Şarj adaptörleri, kablolar ve piller bu amaçla açılmaz, kablo kesilmez. Şarj adaptörünün içinde şebeke gerilimi vardır ve çok tehlikelidir. Kabloyu kesip bakmak da şarj eden bir kabloda kısa devreye ve yangına yol açabilir. Bu slayttaki kesit bir çizimdir; gerçeği görmek için internetteki röntgen ya da kesit fotoğraflarına bakılır.

**Bağlantı:** Geri: "PCB'deki toprak katmanı" slaydı. Kablodaki GND telleri fişten girip kartın o toprak katmanına ulaşır; VBUS teli 5 V'u getirir. İleri: "Geliştirme kartı (ESP32)" slaydı. Orada USB-C soketini, CC uçlarındaki 5,1 kΩ'luk dirençleri, USB-seri çeviriciyi ve 3,3 V regülatörü kartın üzerinde bulacağız.

#### 47. Geliştirme kartı

**Konu:** Önceki slaytlarda GND'yi, PCB'nin katmanlarını ve USB-C kablosunun içini gördük. Bu slayt hepsini gerçek bir karta yerleştirir. Kart genel bir ESP32 tabanlı geliştirme kartıdır; Deneyap Kart gibi kartlar da aynı mantıkla yapılır. Düğmeler parçaları enerjinin ve verinin izlediği yola göre sıralar: USB, USB çipi, regülatör, işlemci, kristal, anten, düğmeler, pinler, GND, LED, kondansatör ve dirençler. Sunum kendiliğinden bu sırayla ilerler; bir düğmeye basınca dönüş durur ve o parça incelenir.

**1 · USB:** Kablo kartın tek dış bağlantısıdır. Soket 16 uçludur: VBUS (5 V), GND, CC1 ve CC2, D+ ve D−, birkaç yardımcı uç ve metal gövde (USB-C kablosunun içi slaydı). Kartı bilgisayara takınca hem güç hem veri aynı kablodan gelir.

**2 · USB-seri çevirici:** Bilgisayar USB dilini konuşur (D+ ve D− çifti, iki telin farkına bakan bir hat). ESP32 ise TX ve RX adlı sade bir seri hattı konuşur. Aradaki küçük çip tercümandır: D+/D−'den gelen veriyi TX/RX'e, ESP32'nin yanıtını da geri USB'ye çevirir. Program yükleme ve ekrana yazdırılan mesajlar bu yoldan geçer.

**3 · Regülatör:** VBUS'tan gelen 5 V girer, 3,3 V çıkar; bu 3,3 V hem ESP32'yi hem de 3V3 pinini besler. Aradaki 5 − 3,3 = 1,7 V regülatörün üzerinde kalır ve ısıya dönüşür: kart yaklaşık 0,2 A çekerse 1,7 V × 0,2 A = 0,34 W eder. Regülatörün ısınmasının nedeni budur (Güç ve enerji slaytı).

**4 · İşlemci (ESP32 modülü):** Metal kutunun altında çipler vardır. Çipin içinde iki çekirdek bulunur ve en çok saniyede 240 milyon tık (240 MHz) hızla çalışır. 520 KB RAM, işlemcinin o an üzerinde çalıştığı sayıları tutar. Program ise ayrı bir flaş belleğinde, bu kartta 4 MB'lık bir çipte durur. Çipin içinde bir de Wi-Fi ve Bluetooth radyosu vardır; antene bu radyo bağlıdır. İşlemcinin içinde ne olduğuna Bilgisayar bölümünde gireceğiz.

**5 · Kristal:** Kuvars parçası elektrik verilince çok düzenli titreşir (saniyede 40 milyon kez, 40 MHz). Devre bu titreşimi sayarak düzenli saat tıkları üretir. ESP32 bu 40 MHz'i çarparak kendi hızına çıkarır. Saat, işlemcinin metronomudur: her işlem bir tıkta ilerler. Bu kartta kristal modülün kutusunun içindedir; ekrandaki kutu kalkınca görünür.

**6 · Anten:** PCB üzerindeki zikzak bir bakır yoldur. Akımı 2,4 GHz'lik radyo dalgasına çevirip yayar; gelen dalgayı da tekrar elektrik sinyaline çevirir. Antenin altında ve çevresinde bakır olmaz (anten boşluğu); yoksa sinyal zayıflar.

**7 · Düğmeler:** EN düğmesi kartı kısa süre durdurup programı baştan başlatır (reset). BOOT düğmesi, kart açılırken basılı tutulursa işlemciyi yeni program yükleme kipine sokar. Birçok kart bu işi USB çipiyle otomatik yaptığı için BOOT'a nadiren basılır.

**8 · Pinler:** Kartın kenarındaki delikli bakır halkalara pin sıraları lehimlenmiştir (lehim slaydı). 3V3 pini 3,3 V verir, GND pini 0 V noktasıdır, GPIO pinleri programın seçtiği gibi 0 ya da 3,3 V verir veya dışarıdan gelen 0 ya da 3,3 V'u okur. Pinler 2,54 mm aralıklıdır; kablolar ve breadboard bu aralığa göre yapılır. Sensörler bu pinlere bağlanır (Sensör bölümü).

**9 · GND:** GND pinleri kartın farklı yerlerinde durur ama hepsi PCB'deki bakır toprak katmanına bağlıdır; yani aynı bakır ağdır, aynı sıfır noktasıdır. Bu yüzden kartta çok GND pini vardır: her sensör, her modül kendine en yakın GND pinine bağlanabilir ve akımın dönüş yolu kısa kalır. Bağladığınız her şeyin GND'si kartın GND'sine bağlanmazsa gerilimler aynı sıfıra göre ölçülmez. Bu GND, evdeki koruma toprağı değildir (Evdeki toprak gerçekten toprak mı? slaydı).

**10 · LED:** Küçük bir dirençten geçen akımla yanar. Yandığında kartın elektrik aldığını anlarız (diyot ve direnç slaytları).

**11 · Kondansatör ve dirençler:** Regülatörün girişindeki ve çıkışındaki, ayrıca çiplerin yanındaki küçük kondansatörler gerilimdeki ani dalgalanmaları süzer; çip bir an çok akım çektiğinde yedek kaynak gibi davranırlar. USB soketindeki CC uçlarında 5,1 kΩ'luk iki direnç vardır: şarj aleti bu direnci görünce kartın 5 V isteyen bir cihaz olduğunu anlar ve 5 V verir.

**Güç yolu:** VBUS 5 V → regülatör → 3,3 V → ESP32 ve 3V3 pini (LED'e de ulaşır). Akım GND üzerinden USB kablosuna geri döner; devre bir döngüdür.

**Veri yolu:** bilgisayar → D+/D− → USB-seri çevirici çip → TX/RX → ESP32. Yanıt aynı yoldan geri gider.

**Program nerede?** Yazdığımız program flaş belleğe yüklenir. Flaş, güç kesilince içeriğini korur. RAM ise çalışma masasıdır; güç gidince içindekiler silinir. Kartı bilgisayardan çekip tekrar takınca programın yeniden çalışmasının nedeni budur.

**Sınıfa soru:** USB'den 5 V geliyor, işlemci 3,3 V ile çalışıyor. Aradaki 1,7 V nereye gidiyor? **Cevap:** Regülatörün üzerinde kalır ve ısıya dönüşür; 0,2 A'de 1,7 V × 0,2 A = 0,34 W'tır.

**Sınıfa soru:** Kartı bilgisayardan çıkardık. Program silinir mi? **Cevap:** Hayır, program flaş bellekte durur. Silinen RAM'deki geçici sayılardır.

**Neden çok GND pini?** Hepsi aynı bakır ağa bağlıdır; hangisine bağlarsak bağlayalım aynı sıfır noktasına bağlanmış oluruz. Çok pin olması bağlantıyı kolaylaştırır ve dönüş yolunu kısa tutar.

**Deneyap Kart:** ESP32 tabanlı yerli bir geliştirme kartıdır; Wi-Fi ve Bluetooth içerir. Bu slaytta gösterilen kart genel bir ESP32 kartıdır; parçaların yerleri üreticiden üreticiye değişir.

### 4 · Sensör

#### 48. Sensör nedir?

**İlke:** her sensör bir dönüştürücüdür. Kamera ışığı, mikrofon ses basıncını, ivmeölçer hareketi elektrik sinyaline çevirir.

**Örnekler:** telefonu yan çevirince ekranın dönmesi ivmeölçer, görüşmede kulağa yaklaşınca ekranın kapanması yakınlık sensörü, karanlıkta ekranın kısılması ışık sensörü sayesindedir.

#### 49. Analog ve dijital

**Rampa ve merdiven:** rampada top her yükseklikte durabilir (analog). Merdivende yalnızca seviyelerde durabilir (dijital). Seviye sayısı arttıkça merdiven rampaya benzer.

**Zemin de bir seviyedir:** 0 m yüksekliği de sayılır; 8 seviyeli merdivende 7 blok ve zemin vardır.

**Bit:** 2 basamak 1 bit, 4 basamak 2 bit, 8 basamak 3 bit (2 × 2 × 2), 16 basamak 4 bit. Her bit basamak sayısını ikiye katlar.

**Örnekler:** ibreli saat analog, rakamlı saat dijital; plak analog, müzik dosyası dijital.

#### 50. Gürültü nedir?

**Konu:** “Gürültü” kelimesini ses olarak biliyoruz. Elektronikte aynı kelime başka bir şeyi anlatır: telde ölçtüğümüz gerilimin üstüne binen küçük, rastgele, istemediğimiz değişim. Burada ses yoktur; bir hoparlörde bu değişim cızırtı olarak duyulabilir, ama sensör telinde yalnızca voltmetrenin değeri titrer. Bir önceki slayttaki analog sinyal düzgün bir çizgiydi; gerçek tellerde çizgi her zaman biraz kırışıktır.

**Gürültü sekmesi:** mavi çizgi sensörün verdiği gerilim, kesikli gri çizgi olması gereken “gerçek” değerdir. Aradaki fark gürültüdür. Kaydırıcıyı artırdıkça bant genişler. Görsel, farkı görebilmeniz için dikey ekseni 1,50–1,80 V aralığına büyütür; gerçek sensör 0–3,3 V arasında çalışır, yani gürültü gerçekte çok daha küçük görünür.

**Gerçek sayılar:** ESP32 gibi bir kartın ADC'sinde gürültü çoğu zaman yaklaşık ±0,02 V civarındadır (karta ve ortama göre değişir). 0,02 ÷ 3,3 × 4.095 ≈ 25: yani 1,65 V'u ölçerken kart 2.048 yerine yaklaşık 2.023 ile 2.073 arasında dalgalanan sayılar okur. Aynı gerilimi ölçtüğünüz hâlde her seferinde farklı sayı görmenizin nedeni budur (Analogdan sayıya slaytındaki ADC'de bunu kendiniz göreceksiniz). Kaydırıcı 0,30'dayken görsel bu değeri gösterir; 1,00'da ±0,067 V olur.

**Gürültü nereden gelir? (Kaynaklar sekmesi)** (1) Isı: her iletkenin içinde titreşen iyonlar ve serbest elektronlar rastgele hareket eder (direnç slaytında gördük: titreşen iyonlar elektronlara çarpar). Bu rastgele hareket, ölçtüğümüz gerilimde küçük bir rastgele değişim yaratır; sıcaklık arttıkça büyür ve hiçbir iletkende sıfır olmaz. Buna ısıl gürültü denir. (2) Motor ve anahtar: fırçalı motorda ve açılıp kapanan anahtarda akım ani değişir; bu da çevreye elektromanyetik dalga yayar ve yakındaki tellere gürültü olarak biner. (3) Radyo dalgaları: telefon, Wi-Fi, Bluetooth ve radyo istasyonları havaya dalga yayar; sensör teli küçük bir anten gibi bunları yakalar. (4) Yan yana kablo: komşu telde akım değişiyorsa bu değişim yandaki tele geçer.

**Neden tamamen yok edemiyoruz?** Isıl gürültü maddenin kendisinden gelir: sıcaklığı olan her iletkende elektronlar kıpırdar. Dalgalar da her yerdedir. Bu yüzden amaç sıfırlamak değil, sinyali gürültüden yeterince büyük tutmaktır. Sinyal 1,65 V, gürültü 0,02 V ise sinyal gürültüden yaklaşık 83 kat büyüktür; okuma güvenilirdir.

**Gürültü ADC'yi nasıl etkiler?** ADC gerilimi sayıya çevirirken gürültüyü de sayar. Gürültü ±25 ise sayının son birkaç basamağı anlamsızdır: 12 bitlik ADC'nin bir basamağı yaklaşık 0,8 mV iken gürültü yaklaşık 20 mV'tur. Bu yüzden iyi sonuç için ölçüm birkaç kez tekrarlanır ve ortalaması alınır.

**Ortalama sekmesi:** gürültü rastgele olduğu için bir okuma gerçek değerin biraz üstünde, bir sonraki biraz altındadır. N okumayı toplayıp N'ye bölersek artı ve eksi sapmalar birbirini götürür; gürültü yaklaşık √N kat küçülür. 10 okuma için √10 ≈ 3,2 kat, 100 okuma için √100 = 10 kat: ±0,02 V yaklaşık ±0,002 V olur (ADC'de ±25 yaklaşık ±2,5). Bedeli zamandır: 100 okuma 100 kat daha fazla süre ister, ama sensörler yavaş değiştiği için çoğu zaman sorun olmaz. Bu, gürültüyü yazılımla küçültmenin yoludur.

**Donanımla azaltma:** Kondansatörlü süzgeç (filtre): sensör teli ile GND arasına bir kondansatör koyarsak hızlı titreşimler kondansatörden GND'ye kaçar, yavaş değişen gerçek sinyal geçer (kondansatör slaytında bu RC süzgeci tanıyacağız). Bükümlü çift: iki tel birbirine sarılırsa dışarıdan gelen gürültü iki tele de aynı etkiyi yapar ve iki telin farkı alındığında silinir; USB-C kablosundaki D+ ve D− bu yüzden bükülü gider, zırh ise telin etrafına sarılan, GND'ye bağlı metal örgüdür ve dalgaları dışarıda tutar (bu slaytlar daha sonra gelecek). Ayrıca sensör telini kısa tutmak (kısa tel daha küçük bir antendir), sensörü motor ve anahtardan uzağa koymak ve sensör kablosunu güç kablosundan ayırmak gürültüyü azaltır.

**Dijital neden daha güvenli?** Dijital sinyalde yalnızca iki durum var ve aralarında bir eşik: 3,3 V ÷ 2 = 1,65 V. Gürültü sinyali eşiği geçecek kadar itmedikçe kart 1'i 1, 0'ı 0 okur; gürültü “silinir”, bilgi aynen geri gelir. Analogda küçük bir gürültü bile sayıyı değiştirir; dijitalde yalnızca eşiği aşan gürültü bit bozar. Dijital sekmesinde gürültü bilerek gerçekte olduğundan çok büyük çizilmiştir (en çok ±2,2 V); kaydırıcıyı yükseltince ±1,65 V'u aşan gürültü bazı bitleri ters çevirir ve “bit yanlış” sayacı çalışır. “Neden dijital?” slaytında bu fikri sürdüreceğiz.

**Bağlantı:** Bir önceki slaytta analog ve dijitali ayırmıştık. Sonraki iki slayt bu konuya dayanır: Analog sensörler (sensör gerilimi gürültüyle birlikte gelir) ve Analogdan sayıya (ADC gürültüyü de sayar).

**Sınıfa soru 1:** Telefonu sensör kablosunun yanına koyup arama yapınca okuma neden bozulabilir? **Cevap:** Telefon radyo dalgası yayar; sensör teli bu dalgayı bir anten gibi yakalar ve gerilime küçük, rastgele bir değişim ekler. Kabloyu kısaltmak, bükümlü ya da zırhlı kablo kullanmak ve telefonu uzaklaştırmak etkiyi azaltır.

**Sınıfa soru 2:** Bir ışık sensörünü 100 kez okuyup ortalamasını alırsak gürültü kaç kat küçülür? **Cevap:** √100 = 10 kat. 100 okuma ile gürültü onda birine iner.

**Güvenlik notu:** Bu slayttaki hiçbir şey şebeke gerilimiyle denenmez. “Motor gürültüsü” anlatılırken yalnızca pille çalışan küçük bir fırçalı motor kullanılabilir.

#### 51. Analog sensörler

**LDR (ışığa duyarlı direnç):** kadmiyum sülfür (CdS) şeridi. Işık fotonları elektronları bağlarından koparır; serbest elektron arttıkça direnç düşer. Karanlıkta yüzlerce kiloohm, aydınlıkta birkaç kiloohm.

**NTC termistör:** yarı iletken bir seramik; ısındıkça daha çok taşıyıcı serbest kalır, direnci azalır (silisyum slaytını hatırlayın).

**Gerilim bölücü (iki adım):** (1) Seri bağlı: toplam direnç = Rsensör + 10 kΩ; akım I = 3,3 ÷ (Rsensör + 10 kΩ). (2) Vout, 10 kΩ'un üzerinde okunur: Vout = I × 10 kΩ (Ohm). Birleştirince Vout = 3,3 V × 10 kΩ ÷ (Rsensör + 10 kΩ): çarpma, toplama ve bölme bir arada. Örnek: karanlıkta LDR 100 kΩ ise I = 3,3 ÷ 110 kΩ = 0,03 mA ve Vout = 0,03 mA × 10 kΩ = 0,3 V. Aydınlıkta LDR 1 kΩ ise Vout = 3,3 × 10 ÷ 11 = 3,0 V. Işık arttı, gerilim arttı. Potansiyometre: düğmeyle ayarlanan, üç uçlu değişken dirençtir.

#### 52. Analogdan sayıya

**Hesap:** sayı = Vout ÷ 3,3 V × 4.095. 1,65 V (tam yarı) → yaklaşık 2.048. Bir basamak 3,3 V ÷ 4.096 ≈ 0,8 mV'tur: kart bundan küçük farkları ayırt edemez.

**Bağlantı:** bir önceki slayttaki ışık sensörünün gerilimi bu sayıya dönüşür; programcı artık “ışık 2.048” gibi bir sayıyla çalışır.

**Nasıl çevrilir?** Kart gerilimi yarıyla karşılaştırır: büyükse 1, küçükse 0 yazar; kalan aralığı yeniden ikiye böler. 12 karşılaştırma 12 bit verir. Örnek: 1,65 V tam ortadır: ilk bit 1, geri kalanlar 0 → 1000 0000 0000 = 2.048.

**Gerçek kart:** burada ideal bir ADC görüyoruz. Gerçek ESP32'nin ölçümü tam doğrusal değildir: 0 V'a ve 3,3 V'a çok yakın gerilimlerde sapar, çipten çipe de küçük farklar olur. Kartta analogRead ile okuduğunuz sayı bu slayttaki ideal değerden biraz farklı çıkabilir; bu bir hata değil, gerçek ölçümün doğasıdır.

#### 53. Mesafe sensörü

**Çalışma:** T (verici) 40 kHz'lik kısa bir ses gönderir; R (alıcı) yankıyı dinler. Kart aradaki süreyi ölçer ve d = 343 m/s × t ÷ 2 hesabını yapar.

**Örnek:** 2,9 ms → 343 × 0,0029 ÷ 2 ≈ 0,50 m.

**Fizik nedir slaytını hatırlayın:** gök gürültüsünde de yol = hız × süre hesabını yapmıştık. Orada ses yalnızca bize doğru geliyordu; burada gidip döndüğü için sonucu 2'ye böleriz. Sensör süreyi milyonda bir saniye hassasiyetle ölçer.

**Sınıfa soru:** Hava ısınınca ölçüm nasıl değişir? **Cevap:** 343 m/s, 20 °C havanın değeri. Hava 1 °C ısındıkça ses yaklaşık 0,6 m/s hızlanır; 30 °C'de yaklaşık 349 m/s olur. 50 cm uzaktaki cisme gidiş-dönüş 2 × 0,50 = 1,00 m yol vardır: 1,00 m ÷ 349 m/s ≈ 2,87 ms. Ses hızlı olduğu için yankı daha erken döner. Kart hâlâ 343 ile hesaplarsa 343 × 0,00287 ÷ 2 ≈ 0,49 m bulur, yani cismi biraz yakın ölçer. Hassas cihazlar sıcaklığı da ölçüp hızı buna göre düzeltir.

#### 54. Sensör karta nasıl konuşur?

**Konu:** Sensörün ölçtüğü değer ESP32'ye nasıl ulaşır? Cevap: teller üzerinden, gerilim olarak. Kartın pinleri birer metal uçtur; sensörden gelen şeyin ne anlama geldiğine sensör ile kart önceden anlaşmak zorundadır. Bu anlaşmaya haberleşme kuralı (protokol) denir. Görselde her tel, gerilimini zaman içinde çizen bir şerit olarak görünür: şeridin üst çizgisi 3,3 V (1), alt çizgisi 0 V (0). Mavi çizgi karttan çıkan, bakır çizgi sensörden gelen sinyaldir. Slayttaki zamanlar çok yavaşlatılmıştır; gerçekte bu bitler mikrosaniyeler sürer.

**Bağlantı:** "Analogdan sayıya" slaydında ADC'nin gerilimi sayıya çevirdiğini görmüştük; burada o gerilimin telden karta nasıl geldiğine bakıyoruz. Bir sonraki slayt, bitlerin neden tek tek (seri) gönderildiğini ve paralel göndermenin neden zorlaştığını anlatır.

**Analog:** LDR (ışığa duyarlı direnç) ya da potansiyometre gibi sensörler pine 0 V ile 3,3 V arasında herhangi bir gerilim verir; ışık arttıkça gerilim de değişir. Telde sayı yoktur, yalnızca bir düzey vardır. Sayıya çevirmek karttaki ADC'nin işidir: ESP32'nin ADC'si 12 bittir, yani 0 V'u 0, 3,3 V'u 4.095 sayar. Örnek: 1,90 V ÷ 3,3 V × 4.095 ≈ 2.358. Güç telleri (3,3 V ve GND) her sensörde ayrıca vardır; görselde yalnızca sinyal teli çizildi. Çoğu analog sensör tek sinyal teli kullanır.

**Dijital:** Düğme ya da PIR (hareket) sensörü yalnızca iki durum bildirir. Düğme basılınca pin 3,3 V'a bağlanır (1), bırakılınca bir direnç pini 0 V'a indirir (0). PIR hareket görünce çıkışını birkaç saniye 1 tutar. Burada önemli olan düzeyin değeri değil, ne zaman değiştiğidir. Pin tek bir telden 0 ya da 1 okur; ara gerilimlerin anlamı yoktur.

**Darbe (HC-SR04):** Bilgi, bir darbenin genişliğinde taşınır. Kart TRIG pinine yaklaşık 10 µs'lik kısa bir 1 gönderir; sensör ultrason darbesi yollar ve ses bir engele çarpıp dönene kadar ECHO pinini 1 tutar. ECHO'nun 1 kaldığı süre t'dir. Ses 343 m/s ile yol alır ve gidip döndüğü için mesafe d = 343 × t ÷ 2'dir. Örnek: t = 2,9 ms ise d = 343 × 0,0029 ÷ 2 ≈ 0,50 m. Ayrıntı "Mesafe sensörü" slaydındadır. Uyum notu: HC-SR04'ün ECHO çıkışı çoğu modelde 5 V verir, ESP32 pinleri ise 3,3 V ister; bu yüzden araya iki dirençli bir gerilim bölücü konur. Bu, 5 V'luk sinyali 3,3 V'a indirmenin yoludur.

**I2C:** İki tel: SDA (veri) ve SCL (saat). Aynı iki tele birden çok sensör bağlanabilir; her sensörün kendi adresi vardır (kapı numarası gibi, 7 bitlik). Bir işlem şöyle ilerler. START: SCL 1'deyken SDA 1'den 0'a iner, "şimdi konuşacağım" demektir. Kart 7 bitlik adresi gönderir (1001000 = 64 + 8 = 72 = 0x48), ardından bir R/W biti: 1 ise "oku", 0 ise "yaz". Adresi tutan sensör SDA hattını bir saat tıkı boyunca 0 yapar; buna ACK (onay) denir. Sonra sensör veri baytını en büyük bitten başlayarak (MSB) gönderir: 0001 1010 = 16 + 8 + 2 = 26, yani 26 °C. Kart son baytı aldığında NACK (SDA'yı bırakır, hat 1 olur) ile "yeter" der ve STOP gelir: SCL 1'deyken SDA 0'dan 1'e çıkar. Saat telinin işi şudur: SDA'daki gerilimin hangi anda bir bit sayılacağını belirler; her bit, SCL yükselirken okunur. Çekme dirençleri (pull-up) hatları boştayken 3,3 V'ta tutar; cihazlar hattı yalnızca 0'a çekebilir (açık savak, open drain), 1'i dirençler sağlar. Bu yüzden iki cihaz aynı anda konuşmaya kalkarsa kısa devre olmaz. Standart hız 100 kHz, hızlı kip 400 kHz'dir.

**SPI:** Dört tel: SCK (saat), MOSI (karttan sensöre veri), MISO (sensörden karta veri) ve CS (cihaz seç). Birden çok cihaz varsa SCK, MOSI ve MISO ortaktır, ama her cihaza ayrı bir CS teli gider. CS 0 olan cihaz seçilmiştir, yalnızca o konuşur; seçilmeyen cihaz MISO hattını bırakır (görselde kesik çizgi). Her saat tıkında bir bit MOSI ile gider, bir bit MISO ile gelir; iki yön aynı anda çalışır, bu yüzden SPI çok hızlıdır (MHz düzeyinde, onlarca MHz'e kadar çıkabilir). Bedeli tel sayısıdır: her yeni cihaz için bir CS teli daha gerekir. Görselde komut 1010 0101 gider, cevap olarak 0001 1010 = 26 gelir.

**UART:** İki tel: TX (gönder) ve RX (al). Bağlantı çapraz yapılır: kartın TX'i sensörün RX'ine, kartın RX'i sensörün TX'ine gider; biri konuşurken öteki dinler. Saat teli yoktur; iki taraf hızı (baud, saniyedeki bit sayısı) önceden anlaşır. Hat boşta 1'dedir. Bir karakter bir çerçeve halinde gider: 1 başlangıç biti (0), 8 veri biti (önce en küçük bit, LSB) ve 1 bitiş biti (1). Örnek: A harfi = 0x41 = 0100 0001 = 64 + 1 = 65 (ASCII); hatta sırayla 1000 0010 gider. 9.600 baud'da 1 bit = 1 ÷ 9.600 ≈ 104 µs, 10 bit = 1,04 ms'dir. Hızlar farklı olursa alıcı bitleri yanlış anda okur ve anlamsız harfler çıkar. Bilgisayarla konuşurken kullanılan seri ekran da UART'tır (genellikle 115.200 baud).

**Neden üç yöntem var?** Her yöntem üç şeyden birini seçer: tel sayısı, hız ve cihaz sayısı. UART en az telle iki cihazı birbirine bağlar ama saat yoktur, hızı sınırlıdır. I2C yalnızca iki telle onlarca cihaz bağlar (adres sayesinde) ama orta hızdadır. SPI en hızlıdır ama cihaz başına bir tel daha ister. Sensör üreticisi hangisini seçmişse kart da onu konuşur; öğrencinin bilmesi gereken, hangi telin ne taşıdığıdır. Pin türlerinin çok olmasının nedeni de budur: bazı pinler analog okur, bazıları 0 ya da 1 okur, bazıları I2C, SPI ya da UART için ayrılmıştır.

**Kodda nasıl görünür?** Arduino ve Deneyap yazılımında bu yöntemlerin her birinin hazır bir kütüphanesi vardır: analogRead ve digitalRead pinleri okur, Wire I2C'yi, SPI kütüphanesi SPI'yi, Serial ise UART'ı sürer. Bu işlevleri çağırdığınızda kart yukarıdaki bitleri ve saatleri sizin yerinize üretir. Kodlama başka eğitmenlerce anlatıldığı için burada yalnızca adlarını duyurmak yeterlidir.

**Sınıfa soru:** Aynı iki telde iki sensör varsa karta ikisinin cevabı karışmaz mı? **Cevap:** Karışmaz. Kart önce adresi gönderir; yalnızca o adrese sahip sensör ACK verir ve konuşur. Öteki sensör adresin kendisine ait olmadığını görür ve hattı bırakır. Kapı numarası gibi: kapıyı çalan "48 numara" derse yalnızca 48 numara cevap verir.

**Güvenlik:** ESP32 pinleri 3,3 V ister; 5 V'luk bir sinyal gerilim bölücü olmadan doğrudan pine bağlanmaz. Sınıfta yalnızca düşük gerilimli, pil ya da USB ile çalışan kartlar kullanılır.

### 5 · Bilgisayar

#### 55. Elektriğe yön vermek

**Ana fikir:** bilgisayar başka bir şey değildir: elektriği yönlendiren anahtarlar. Her 1, akımın geçtiği; her 0, akımın geçmediği bir anahtardır. İki bitlik bir kod dört yoldan birini seçer. Demiryolu makasları gibi: anahtarlar yolu seçer.

**Bitleri kim ayarlar?** İnsan eli değil, başka transistörler. Bir transistörün çıkışı bir sonrakinin kapısına bağlanır; böylece milyarlarca anahtar birbirini yönetir.

Bu bölümde bu basit fikirden piksellere, gigabaytlara ve uydulara kadar gideceğiz.

#### 56. Mantık işlemleri

**VE:** iki anahtar seri: ikisi de kapalıysa (1 ve 1) lamba yanar. Örnek: çamaşır makinesi kapak kapalı VE başlat düğmesine basıldıysa çalışır.

**VEYA:** iki anahtar paralel: biri bile kapalıysa lamba yanar. Örnek: ön kapının VEYA arka kapının düğmesine basılınca aynı zil çalar.

**DEĞİL:** girişin tersi. Örnek: hava aydınlık DEĞİL ise sokak lambası yanar. DEĞİL kapısı bir transistörle yapılır: giriş 1 olunca kanal açılır, çıkış 0 olur.

**Sınıfa soru:** Hava karanlıkken VE hareket varken yanan bahçe lambasını hangi kapılarla kurarız? **Cevap:** Işık sensörünün çıkışını DEĞİL kapısıyla tersine çevirir, hareket sensörüyle birlikte VE kapısına bağlarız.

#### 57. Sekiz anahtar, bir harf

**Basamak değerleri:** 128, 64, 32, 16, 8, 4, 2, 1: sağdan sola gidince her değer bir öncekinin iki katıdır. Onluk sayılarda basamaklar 1, 10, 100 diye gider; ikilikte 1, 2, 4, 8 diye. 1 olan anahtarların değerlerini toplarız: 01000100 = 64 + 4 = 68 = D. Sekiz anahtarın hepsi 1 ise 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255: bir bayt 0'dan 255'e kadar, yani 256 değer taşır; renk kanalları da (0–255) bu yüzden böyledir. Örnek: 00000101 = 4 + 1 = 5.

**Harfler:** bilgisayarlar harfleri sayılarla saklar (ASCII). Türkçe karakterler (ğ, ş, ı) bu tabloda yoktur; onlar için daha uzun kodlar (UTF-8) kullanılır.

Düğmelere basarak sınıfla birlikte kendi harflerinizi oluşturun. Örnek: 01000001 = 65 = A.

#### 58. Bilgisayar nasıl toplar?

**Yarım toplayıcı:** iki bitin toplamı en fazla 2'dir; ikilik sistemde 2 = 10. Toplam basamağı ÖZEL VEYA ile, elde basamağı VE ile bulunur. ÖZEL VEYA: girişler farklıysa 1, aynıysa 0. İki basamaklı örnek: 3 + 1 → 11 + 01 = 100 (sağdan sola, elde taşınır).

**Büyük sayılar:** bu devre yalnızca iki biti toplar; önceki basamaktan gelen eldeyi alamaz, bu yüzden adı yarım toplayıcıdır. İki yarım toplayıcı ve bir VEYA kapısı birleşince üç biti (A, B ve gelen elde) toplayan tam toplayıcı olur. Tam toplayıcılar zincir gibi yan yana dizilir; her basamağın eldesi bir sonrakine aktarılır. 64 bitlik bir işlemci bunu saniyede milyarlarca kez yapar.

#### 59. İşlemcinin içinde ne olur?

**Konu:** bir bilgisayar programı gerçekte nasıl çalışır? Bu slayt, bu derslerde öğrendiğimiz her parçayı tek bir zincirde birleştirir: transistör, mantık kapısı, toplayıcı, ALU, işlemci. Görsel basitleştirilmiş ve yavaşlatılmıştır; gerçek işlemci bunu saniyede milyarlarca kez yapar. Görseldeki komut kodları (0001 0101 gibi) açıklama için uydurulmuştur, gerçek bir işlemcinin kodu değildir.

**Komut nedir:** komut, bellekte duran bir sayıdır (bit dizisi). İşlemci bu sayının ne anlama geldiğini bilir; örneğin “R1’e 5 koy” ya da “R1 ile R2’yi topla”. Program, bu komutların bellekte arka arkaya dizilmiş halidir. Dört satırlık örnek: (1) R1 ← 5, (2) R2 ← 7, (3) R1 ← R1 + R2, (4) sonucu belleğe yaz. Hesap: 5 + 7 = 12; ikilikte 0101 + 0111 = 1100, çünkü 8 + 4 = 12.

**Dört aşama:** **1. Getir:** program sayacı (hangi komutun sırada olduğunu tutan sayı) adresi program belleğine gönderir; komut komut kaydına gelir. **2. Çöz:** denetim birimi komutun bit desenine bakar ve hangi parçaların çalışacağını belirleyen işaretleri yakar (hangi yazmaç okunacak, ALU toplayacak mı, sonuç nereye yazılacak). **3. Yürüt:** ALU işi yapar; toplamada R1 ve R2’deki bitler toplayıcıya girer. **4. Yaz:** sonuç yazmaca (ya da veri belleğine) geri yazılır ve program sayacı bir sonraki satıra geçer. Sonra döngü yeniden başlar. “Otomatik” düğmesi dört satırı sırayla dolaştırır; Getir, Çöz, Yürüt, Yaz düğmeleri ise üçüncü satırı (toplama) seçilen aşamada tekrar tekrar oynatır.

**ALU ve toplayıcı:** ALU (aritmetik mantık birimi) işlemcinin hesap yapan parçasıdır. İçinde toplayıcılar ve VE, VEYA, ÖZEL VEYA gibi mantık işlemleri vardır. “Bilgisayar nasıl toplar?” slaytındaki yarım toplayıcıyı hatırlayın: toplam basamağı ÖZEL VEYA ile, elde VE ile bulunuyordu. ALU’da bu devreler yan yana dizilir; her basamağın eldesi bir sonraki basamağa geçer (iki yarım toplayıcıdan yapılan tam toplayıcılar). Mantık kapılarının her biri de “Transistör” slaytındaki gibi birkaç transistörden oluşur.

**Yazmaç neden var:** yazmaç, işlemcinin içindeki çok küçük ve çok hızlı not kâğıtlarıdır. ALU yalnızca yazmaçlardaki sayılarla çalışır. Her toplama için RAM’e gidip gelmek çok yavaş olurdu; işlemci üzerinde çalıştığı sayıları yazmaçta tutar.

**Önbellek (cache):** RAM, işlemciye göre uzak ve yavaştır. Önbellek, işlemciye çok yakın duran küçük ve hızlı bir bellektir; sık kullanılan komut ve veriler oraya kopyalanır. Çalışma masası benzetmesi: yazmaç elinizdeki kalem, önbellek masanın üstündeki defter, RAM masanın çekmecesi, depolama (SSD) odanın kitaplığıdır. Görselde önbellek yoktur; konu fazla dağılmasın diye çıkarıldı.

**Çekirdek:** bir çekirdek, böyle bir döngüyü (komut kaydı, denetim birimi, yazmaçlar, ALU) tek başına döndürebilen bir işlemcidir. ESP32’de bu parçalardan iki tane vardır: iki çekirdek, iki ayrı komut dizisini aynı anda çalıştırabilir. Bu yüzden çekirdek sayısı fiziksel bir şeydir: aynı çip üzerindeki ayrı devre kopyaları.

**Saat ve tık:** bütün bu parçaların aynı ritimde çalışması gerekir. Saat, düzenli aralıklarla 1 ve 0 arasında gidip gelen bir sinyaldir; her yükselişi bir “tık”tır ve her tıkta devre bir adım atar. ESP32 kartında saati 40 MHz’lik bir kristal verir; işlemci bunu çarparak en çok 240 MHz’e çıkarır (saniyede 240 milyon tık). Bilgisayardaki 3 GHz, saniyede 3 milyar tık demektir (1 tık ≈ 0,33 nanosaniye). Görselde saat çok yavaşlatılmıştır: bir tık yaklaşık 0,35 saniye sürer.

**Zincir:** transistör → mantık kapısı → toplayıcı → ALU → işlemci çekirdeği → ESP32 modülü → geliştirme kartı. “Geliştirme kartı” slaytındaki ESP32 modülünün içindeki işlemci, bu slayttaki blokların hepsini barındırır. Kartın üzerindeki bakır yollar, o işlemcinin 3,3 V ile 1 ve 0 olarak konuştuğu pinlere ulaşır.

**Program nerede durur:** programın komutları flash belleğindedir (ESP32 modülünde örneğin 4 MB). Flash, “Bilgisayarın içi” slaytındaki SSD gibi, elektrik kesilse de unutmaz; bu yüzden kartı fişten çekip yeniden taktığınızda program yine oradadır. RAM ise elektrik kesilince unutur; işlemin ara sonuçları ve değişkenler orada durur. Görselde R1’deki 12’nin RAM’e yazılması bu yüzden elektrik kesilince kaybolacak bir kayıttır; kalıcı olması için flash’a ayrıca yazılması gerekir.

**Sınıfa soru:** İşlemci bir saniyede nasıl 3 milyar iş yapabiliyor? **Cevap:** Aslında “3 milyar iş” değil, 3 milyar tık: her tık küçük bir adımdır. Bir işlem (toplama gibi) birkaç adım sürer. Ayrıca işlemci bir komutun bitmesini beklemez: biri yürütülürken sonraki çözülür, ondan sonraki getirilir; yani adımlar çamaşırhanedeki gibi üst üste biner (buna boru hattı denir). Birkaç çekirdek ve çok küçük bir tık süresiyle toplamda milyarlarca işlem çıkar.

**Sınıfa ikinci soru:** Elektrik gidince RAM’deki sayı neden kaybolur, program neden kaybolmaz? **Cevap:** RAM bitleri kondansatörlerde yük olarak tutar, yük sızar ve elektrik olmadan tazelenemez. Flash bitleri yalıtkan bir katmanla çevrili hücrelerde tutar, yük orada yıllarca kalır.

**Sırada:** bu çip, yani bu kadar transistör, nasıl yapılıyor? Bir sonraki slayt “Kumdan çipe”: kum nasıl silisyuma, silisyum nasıl milyarlarca transistörlü bir çipe dönüşür.

#### 60. Kumdan çipe

**Üretim:** kum ve kuvarstan elde edilen silisyum arıtılır, eritilir ve dönen bir tohum kristalinden yavaşça çekilerek tek parça bir külçe büyütülür (Czochralski yöntemi). Külçe ince plakalara (wafer) dilimlenir. Işıkla desen basma, aşındırma ve katkılama adımları yüzlerce kez tekrarlanır.

**Ölçek:** bugünkü transistörler yalnızca birkaç on nanometre büyüklüğündedir; tırnak büyüklüğünde bir çipte on milyarlarca transistör bulunur.

#### 61. Bilgisayarın içi

**Güç kaynağı:** 230 V AC'yi 12 V, 5 V ve 3,3 V DC'ye çevirir (diyotlar, transformatör, kondansatörler).

**RAM:** her biti minicik bir kondansatörde yük olarak tutar. Yük sızdığı için her 64 ms’de bir, yani saniyede yaklaşık 16 kez (1.000 ÷ 64 ≈ 16) tazelenir; elektrik kesilince bilgi kaybolur.

**SSD:** elektronları yalıtkan bir katmanla çevrili hücrelere hapseder; güç olmadan yıllarca kalabilir.

**Sınıfa soru:** Elektrik kesilince kaydetmediğiniz ödev neden kaybolur? **Cevap:** Üzerinde çalıştığınız şey RAM'dedir; kaydetmek onu SSD'ye yazmaktır.

#### 62. Piksel nedir?

**Renk:** her piksel üç alt pikselden oluşur. Her biri 8 bitle (256 kademe, 0–255) kontrol edilir: 256 × 256 × 256 = 16.777.216 renk.

**Göz:** gözümüzdeki üç tür koni hücresi kırmızıya, yeşile ve maviye duyarlıdır; ekran gözümüzü bu üç rengi karıştırarak kandırır.

Sürgülerle sınıfa renk ürettirin: kırmızı ve yeşili en yüksek, maviyi sıfır yapın: sarı.

#### 63. Çözünürlük ve yenileme hızı

**Çözünürlük:** Full HD 1920 × 1080 = 2.073.600 piksel; 4K 3840 × 2160 = 8.294.400 piksel, yani dört katı. “4K” adı genişlikteki yaklaşık 4.000 (3840) pikselden gelir; piksel sayısının 4 katı olması ayrı bir sonuçtur (2 kat geniş × 2 kat yüksek).

**Yenileme hızı:** 60 Hz ekran saniyede 60 yeni görüntü çizer. Film aslında hızla değişen fotoğraflardır; göz bunları hareket olarak algılar.

**Sınıfa soru:** 4K ekranda Full HD'nin kaç katı piksel vardır? **Cevap:** 8.294.400 ÷ 2.073.600 = 4, yani 4 katı.

#### 64. Bit, bayt, gigabayt

**Basamaklar:** 1 bayt bir harf. 1 KB yaklaşık yarım sayfa yazı (1.000 harf). 1 MB bir kitabın yazısı ya da bir fotoğrafın küçük bir sürümü. 1 GB yaklaşık 15–30 dakikalık HD film; 2 saatlik bir film birkaç GB tutar. 1 TB bir kütüphane.

**Ham boyut:** Full HD bir kare 2.073.600 piksel × 3 bayt ≈ 6 MB; 12 MP bir fotoğraf 12.000.000 × 3 = 36 MB. Telefon dosyayı sıkıştırır (benzer renkleri kısa yazar), bu yüzden bir fotoğraf yaklaşık 3 MB tutar.

**1.000 mi 1.024 mü?** Bilgisayarlar ikilik sistemle çalıştığı için bazı yerlerde 1 KB = 1.024 bayt kullanılır: 10 tane 2'yi çarparsak (2 × 2 × … × 2) 2¹⁰ = 1.024 çıkar, yani ikilik sistemde “bin”e en yakın sayı budur. Bu yüzden 1 TB'lık bir disk (1.000.000.000.000 bayt) bilgisayarda 1.000.000.000.000 ÷ 1.073.741.824 ≈ 931 GB görünür.

**Sınıfa soru:** 64 GB'lık bir telefona 4 MB'lık kaç şarkı sığar? **Cevap:** 64.000 ÷ 4 = 16.000.

#### 65. GHz, çekirdek, RAM

**GHz:** işlemcinin saati. Her tıkta işlemci işi bir adım ilerletir (transistörler, taşıdıkları değerleri bir sonraki adıma aktarır); 3 GHz saniyede 3 milyar tık demektir: 1 tık = 1 s ÷ 3.000.000.000 ≈ 0,33 nanosaniye (saniyenin milyarda biri).

**Dikkat:** yalnızca GHz'e bakmak yanıltır: bir komutun kaç tık sürdüğü ve kaç çekirdek olduğu da önemlidir. 4 çekirdek × 3 GHz, tek çekirdeğin 12 GHz'i demek değildir.

**Çekirdek:** aynı çipteki bağımsız işlemciler. 4 çekirdek aynı anda 4 iş yapabilir.

**RAM ve depolama:** RAM çalışma masası (küçük, çok hızlı, elektrik kesilince unutur); SSD raf (büyük, daha yavaş, hatırlar). Bir program açtığınızda raftaki kitabın bir kopyası masaya açılır; asıl kitap rafta kalır. Elektrik kesilince yalnızca masadaki kopya kaybolur.

#### 66. Telefon bataryası

**Hesap:** 5.000 mAh × 3,85 V = 19.250 mWh ≈ 19,3 Wh. 18 W'lık şarj aletiyle ideal süre 19,3 ÷ 18 ≈ 1,1 saat. Gerçekte pil dolmaya yaklaştıkça şarj yavaşlatılır; bu pili korur.

**Çalışma:** şarjda lityum iyonları metal oksit tarafından grafit tarafına geçer, elektronlar dış devreden aynı yöne gider. Kullanımda her ikisi geri döner.

**Sınıfa soru:** Neden pilinizi sıcak bir arabada bırakmamalısınız? **Cevap:** Yüksek sıcaklık pildeki kimyasalları bozar ve kapasitesini kalıcı olarak azaltır.

#### 67. Dokunmatik ekran

**Saydam iletken:** indiyum kalay oksit (ITO) bir metal oksittir; o kadar ince sürülür ki ışığı geçirir ama serbest elektronları sayesinde elektriği iletir.

**Kapasitif ekran:** camın altında satır ve sütunlar hâlinde saydam iletken çizgiler vardır. Aralarında elektrik alanı oluşur. İletken bir parmak yaklaşınca alanın bir kısmı parmağa yönelir; çip bu küçük değişimi ölçer ve dokunulan noktayı hesaplar.

**Tırnak ve eldiven:** elektrik alanı yalıtkanların içinden geçer; ekranın camı da bir yalıtkandır. Algılanmak için alan çizgilerini kendine çekebilen iletken bir cismin, yani parmağın, cama çok yakın olması gerekir. Tırnakla dokununca iletken parmak ucu tırnağın kalınlığı kadar uzakta kalır; kalın yün eldiven de parmağı camdan uzak tutar. Dokunmatik ekran eldivenlerinin parmak uçlarında iletken iplik bulunur.

**Sınıfa soru:** Ekranın camı da yalıtkan; parmağımız camın üstünden nasıl algılanır? **Cevap:** Elektrik alanı camın içinden geçer. Ekran camı değil, camın hemen üstüne gelen iletken parmağı algılar.

**Sınıfa soru:** Ekran ıslakken neden kendi kendine dokunuyor gibi davranır? **Cevap:** Su damlaları da içlerindeki iyonlar sayesinde alanı değiştirir; ekran onları parmak sanır.

#### 68. İnternet hızı

**Bölme:** 100 Mbps ÷ 8 = 12,5 MB/s. 4 GB'lık (4.000 MB) bir film: 4.000 ÷ 12,5 = 320 saniye = 5 dakika 20 saniye (ideal koşulda).

**Sınıfa soru:** 16 Mbps bağlantıda aynı film ne kadar sürer? **Cevap:** 16 ÷ 8 = 2 MB/s; 4.000 ÷ 2 = 2.000 s ≈ 33 dakika.

#### 69. Veri kabloda nasıl yolculuk eder?

**Konu:** Önceki slaytlarda sensörün bilgisinin kartın içinde nasıl taşındığını (analog gerilim, ADC, I2C gibi hatlar) gördük. Bu slayt, bilginin karttan dışarı, bilgisayara nasıl çıktığını anlatıyor. Zincir şöyle: ESP32 kartı, kart üzerindeki USB-seri çevirici çip, USB kablosu, bilgisayar. Yukarıdaki üç kutu bu zinciri gösterir. ESP32 çipi USB'yi doğrudan konuşmaz; iki tel ve bir hız anlaşmasıyla çalışan basit bir dil (UART: TX ve RX telleri) kullanır. Çevirici çip bu dili USB'nin D+ ve D− çiftine çevirir ve tersini yapar. Bilgisayardaki seri monitör (Arduino IDE'deki mercek simgeli pencere) bu akışı yazı olarak gösterir: kodda “şunu yaz” dediğimiz her şey bu yoldan geçer. Bu derslerde kod yazmıyoruz; yalnızca yolu görüyoruz.

**Paralel görünüm:** Bir bayt 8 bittir (Bit, bayt, gigabayt slaytı). 'A' harfi 01000001 olarak saklanır. En doğal yol 8 tel kullanmaktır: her bit kendi telinden, hepsi aynı anda gider. Yazıcıların eski kabloları böyleydi. Ama saat hızlanınca bit çok kısalır; tellerin boyu, kaplaması, lehim noktaları birbirinden milimetrik farklı olduğu için bitler karşıya aynı anda varmaz. Görselde her tel birkaç piksel kaymış durumda: yavaş saatte kayma bitin yanında önemsiz, hızlı saatte bitin kendisinden büyük olur ve alıcı komşu bitin değerini okur (turuncu hücreler, “bit yanlış”). Üstelik 8 tel, 8 kat bakır, 8 kat bağlantı ucu, daha kalın kablo demektir. Görsel yavaşlatılmıştır; gerçekte olay nanosaniyelerde olur.

**Seri görünüm:** Aynı bayt tek telden, bit bit gider. Her bit için saat bir tık atar. Sınıfa şu söylenebilir: paralelde 1 tıkta 8 bit gider, seride 8 tıkta; bu yüzden tık çok hızlı olmalıdır. Karşılığında tek tel olduğu için teller arası kayma sorunu yoktur. Bit bayt hesabını İnternet hızı slaytındaki gibi düşünün: hız, saniyede kaç bit geçtiğidir (bit/s); bayta çevirmek için 8'e bölünür (örneğin 1.000.000 bit/s ÷ 8 = 125.000 bayt/s). Görselde bitler soldan sağa değil, sağdan sola okunur çünkü önce gönderilen bit karşıya önce varır ve en öndedir; alıcıdaki hücreler ise bayt gibi (en büyük bit solda) dizilir. Görselde sırayla en küçük bit önce gider (UART'taki gibi).

**UART görünümü:** UART saat teli kullanmaz; iki taraf hızı önceden anlaşır, buna baud denir. Hat boştayken 1'dedir (akım geçiyor). Bir karakter gelecekse hat bir bit süresi 0'a iner: bu start bitidir, alıcıya “şimdi başlıyorum” der. Sonra 8 veri biti gelir, önce en küçük bit (D0). 'A' = 01000001 olduğu için sırayla 1 0 0 0 0 0 1 0 gider. En sonda hat 1'e döner: stop biti. Toplam 10 bit. Aritmetik: 115.200 baud demek saniyede 115.200 bit demek. Bir bitin süresi 1 ÷ 115.200 = 8,68 µs (mikrosaniye, saniyenin milyonda biri). 10 bit = 86,8 µs. Saniyede 115.200 ÷ 10 = 11.520 karakter. Aynı hesap 9.600 baud için: 1 bit = 104,2 µs, 10 bit = 1,04 ms, saniyede 960 karakter. Düğmeyle iki hızı karşılaştırın: şeritte 1 milisaniyede 115.200 baud'da 11,52 karakter, 9.600 baud'da 0,96 karakter sığar. Önemli: gönderen ve alan aynı baud'a ayarlı olmazsa bitleri yanlış yerden okur ve ekranda anlamsız karakterler görünür (seri monitörde sık görülen hata budur). Görsel yavaşlatılmıştır: imleç gerçek süreyi yaklaşık 14.000 kat uzatarak gezer.

**Fark (USB) görünümü:** USB kablosunda veri için tek tel değil, D+ ve D− adlı bir çift tel vardır (USB-C kablosunun içi slaytında göstermiştik). Bu iki tel birbirinin tersi gerilimi taşır: biri yükselirken öteki alçalır. Alıcı her telin değerine ayrı ayrı bakmaz, farkını alır: D+ − D−. Kablodan geçen gürültü (motor, telefon, fluoresan lamba gibi kaynaklardan gelen istenmeyen dalgalanma) iki tele de aynı büyüklükte bindiği için fark değişmez. Tek telde ise Neden dijital? slaytındaki eşik kayar: 0 olan bit eşiğin üstüne çıkar, 1 olan eşiğin altına düşer ve alıcı bitleri yanlış okur. Soldaki panel tek teli, sağdaki panel iki telli farkı gösterir; gri bant aynı gürültü patlamasıdır. Çiftin bükümlü olmasının nedeni: iki tel birbirinin yanından dolanırsa gürültü kaynağına eşit uzaklıkta kalırlar, böylece gürültü ikisine de gerçekten aynı bindirilir. Gerçek sistemlerde fark mükemmel sıfır olmaz, ama çok küçük kalır.

**Zincirin bağlantısı:** Karttaki çevirici çip (CH340 veya CP210x türü) bilgisayarın USB tarafında D+ ve D−'yi, ESP32 tarafında TX ve RX'i kullanır. 3,3 V mantık ile USB'nin farklı seviyelerini o çevirir. Kartın USB-C girişinden gelen 5 V kartın regülatöründe 3,3 V'a indirilir.

**Sınıfa soru:** Seri haberleşme paralelden yavaş değil mi? 8 tel yerine tek tel kullanıyoruz. **Cevap:** Hayır. Tek tel çok hızlı saatle çalışır: aynı baytı 8 kat daha kısa bitlerle yollar. Paralelde ise teller arası küçük gecikme farkları hızı sınırlar; hız arttıkça bit kısalır ve kayma bitin yanında büyür. Bu yüzden günümüzde USB, SATA, PCI Express, Ethernet gibi hızlı bağlantıların hepsi seridir.

**Sınıfa soru 2:** Neden D+ ve D− iki ayrı tel, tek tel ve toprak yetmez mi? **Cevap:** Tek tel + toprak olsaydı gürültü yalnızca tele binerdi ve alıcı eşiğe göre yanlış okurdu. İki tel çift olunca gürültü ikisine de aynı biner, alıcı farkı aldığı için çıkarma sonucu değişmez.

**Sonrası:** Bu bitler kabloyla gitmek zorunda değil. Sıradaki Kablosuz dünya slaytında aynı bitler radyo dalgaları olarak havadan da gidiyor: yine bit, yine saat, yine eşik; yalnızca taşıyıcı değişiyor. Gerçekte denenmez notu: kablo uçlarını, USB portunu veya şarj aletlerini açmak ya da kısa devre yapmak gerekmez, bu slayttaki her şey bir görselden okunur.

#### 70. Kablosuz dünya

**Bölme:** λ = c ÷ f. Wi-Fi 2,4 GHz: 300.000.000 ÷ 2.400.000.000 = 0,125 m = 12,5 cm. Dalga boyu, bir dalga tepesinden diğerine olan mesafedir.

**Tarih:** 1865'te Maxwell bu dalgaları denklemleriyle öngördü; 1887'de Hertz laboratuvarında üretti.

**Elektromanyetik dalga:** salınan elektronlar çevrelerinde değişen bir elektrik alanı ve onunla birlikte değişen bir manyetik alan oluşturur; bu ikili ışık hızında yayılır.

**Sınıfa soru:** Mikrodalga fırın neden Wi-Fi'yi bozabilir? **Cevap:** İkisi de yaklaşık 2,4 GHz'te çalışır; fırından sızan küçük bir dalga Wi-Fi'yi karıştırabilir.

**Sınıfa soru:** 5G ve Wi-Fi zararlı mı? **Cevap:** Bir fotonun enerjisi frekansıyla orantılıdır. Wi-Fi fotonu, görünür ışık fotonunun yaklaşık 200.000'de biri kadar enerji taşır (500 THz ÷ 2,4 GHz ≈ 200.000; 5G'de 500 THz ÷ 3,5 GHz ≈ 140.000); atomlardan elektron koparamaz. Bilinen tek etkisi çok hafif ısınmadır; cihazların gücü bu ısınmanın zararsız kalacağı düzeyde tutan uluslararası sınırlarla belirlenir.

#### 71. Bir 1 ve bir 0 dalgaya nasıl yazılır?

**Soru:** “Anten 1'i nasıl gönderir?” Anten bir bit göndermez; yalnızca titreşen bir elektrik ve manyetik dalga yayar. Bu dalgaya taşıyıcı denir; tek başına bilgi taşımaz, çünkü hep aynıdır. Bilgiyi dalganın bir özelliğini bite göre değiştirerek yazarız. Buna modülasyon denir.

**Genlik (AM):** güçlü salınım = 1, zayıf salınım = 0. Alıcı gelen dalganın gücünü ölçer ve bir eşikle karşılaştırır: eşiğin üstü 1, altı 0. **Frekans (FM):** sık salınım = 1, seyrek salınım = 0; güç sabit kalır. Alıcı dalganın ne kadar sık salındığını ölçer. FM radyonun adındaki FM, frekans modülasyonu demektir.

**Gürültü:** yolda dalgaya küçük bozulmalar karışır. Ama güçlü ile zayıf arasındaki fark eşiği aşacak kadar büyük olduğundan alıcı aynı bitleri okur. Bu, “Neden dijital?” slaytında gördüğümüz fikrin aynısıdır.

**Gerçek hızlar:** görseldeki salınımlar çok yavaşlatılmıştır; gerçekte bir Wi-Fi dalgası saniyede 2,4 milyar kez salınır ve her bit bu salınımlardan binlercesini kullanır. Gerçek sistemler genlik, frekans ve fazı birlikte kullanır (örneğin Wi-Fi ve 5G); burada fikri en yalın biçimde gösteriyoruz.

**Sınıfa soru:** Radyoda iki istasyon aynı anda yayın yapınca neden karışmaz? **Cevap:** Her istasyonun taşıyıcı frekansı farklıdır; radyonun düğmesi hangi frekansı dinleyeceğini seçer.

#### 72. Neden dijital?

**Gürültü:** analog sinyale binen her bozulma bilginin parçası olur ve kopyadan kopyaya birikir. Dijital alıcı bir eşik kullanarak 1 ile 0'ı ayırır ve sinyali temiz biçimde yeniden üretir.

**Sınıfa soru:** Kırık telefon oyunu analog mu, dijital mi? **Cevap:** Analog; her aktarımda küçük bozulmalar birikir. Herkes yalnızca “evet” ya da “hayır” söyleseydi mesaj bozulmazdı.

#### 73. Bir mesajın yolculuğu

**Zincir:** mikrofon ses basıncını gerilime çevirir, telefon onu sayılara (bitlere) çevirir, anten bitleri radyo dalgasına çevirir. Modem ve fiber kablo ışık atımlarıyla taşır; baz istasyonu yeniden radyo dalgası yayar; karşı telefon bitleri sese çevirir.

**Sınıfa soru:** İstanbul'daki bir arkadaşa mesaj ne kadar sürede ulaşır? **Cevap:** Isparta–İstanbul kablo yolu yaklaşık 600 km olsun. Işık kabloda saniyede yaklaşık 200.000 km gider: 600 ÷ 200.000 = 0,003 s, yani saniyenin binde 3'ü. Gecikmenin çoğu cihazlarda, sinyal işlenirken oluşur.

#### 74. Göklere

**Yer durağan yörünge:** ekvatorun yaklaşık 35.786 km yukarısında bir uydu, Dünya'nın kendi ekseni etrafında dönme süresiyle (yaklaşık 24 saat) aynı sürede bir tur atar. Yerden bakınca hareketsiz görünür; çanak antenler bu yüzden sabit durur.

**Uyduların içi:** güneş panelleri ışığı elektriğe çevirir, piller gölgede enerji sağlar, devreler ve transistörler sinyali işler: bu derslerde öğrendiğimiz her şey göklerde de çalışır.

**GPS:** telefon en az dört uydudan gelen sinyallerin varış sürelerini karşılaştırır; her süreyi ışık hızıyla çarparak uzaklığı bulur (şimşekteki ve mesafe sensöründeki hesabın aynısı). Bir uyduyla bir küre, iki uyduyla bir daire, üç uyduyla iki nokta kalır; dördüncü uydu telefonun saatindeki hatayı düzeltir ve konumu kesinleştirir. Alçak yörünge (550 km): 2 × 550 ÷ 300.000 ≈ 0,004 s; yer durağan yörünge: 2 × 35.786 ÷ 300.000 ≈ 0,24 s.

**Sınıfa soru:** Uydu neden düşmez? **Cevap:** Aslında sürekli düşer, ama yana doğru saniyede yaklaşık 3 km hızla gittiği için Dünya'nın eğriliğini hep ıskalar.

### Köprü ve kapanış

#### 75. Algoritmaya ilk adım

Bu slayt yalnızca köprüdür; ayrıntıya girmeyin. Algoritmanın bir bilgisayar programı olmak zorunda olmadığını söyleyin: yemek tarifi de bir algoritmadır, yeter ki adımlar açık olsun.

“Göz kararı tuz ekle” bir bilgisayar için belirsizdir; “5 gram tuz ekle” açıktır.

#### 76. Özet

Her cümleyi bir öğrenciye okutun ve kendi örneğiyle açıklamasını isteyin.

#### 77. Kapanış

Soruları alın. G tuşuyla slayt haritasını açıp merak edilen konuya dönebilirsiniz; simülasyon laboratuvarı da açık kalabilir.

**Arka plan:** kapaktaki elektrik alanı. Akan noktalar elektron değildir; alanın yönünü (artıdan eksiye) gösterir. Bu alana bırakılan bir elektron ise tersine, artı yüke doğru çekilir.

---

## Kaynaklar
- IEC 60479-1: akımın insan ve hayvan vücuduna etkileri.
- CODATA: temel fizik sabitleri (elektron yükü ve kütlesi).
- IEC 60062 (direnç renk kodu) ve IEC 60617 (devre sembolleri).
- Elektromanyetizma tarihi: Coulomb (1785), Volta (1800), Ohm (1827), Faraday (1831), Maxwell (1865), Hertz (1887).
