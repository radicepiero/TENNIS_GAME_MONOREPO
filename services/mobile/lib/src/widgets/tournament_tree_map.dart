import 'package:flutter/material.dart';

import '../models/tree.dart';

class TournamentTreeMap extends StatelessWidget {
  final List<MatchDto> matches;
  final int roundMax;
  final String? selectedMatchId;
  final void Function(MatchDto match) onTapMatch;

  static const double _nodeSize = 10;
  static const double _nodeSpacing = 6;
  static const double _roundWidth = 36;

  const TournamentTreeMap({
    super.key,
    required this.matches,
    required this.roundMax,
    this.selectedMatchId,
    required this.onTapMatch,
  });

  @override
  Widget build(BuildContext context) {
    return InteractiveViewer(
      constrained: false,
      minScale: 0.5,
      maxScale: 2.0,
      child: CustomPaint(
        size: _canvasSize(),
        painter: _TreeMapPainter(
          matches: matches,
          roundMax: roundMax,
          selectedMatchId: selectedMatchId,
          onTapMatch: onTapMatch,
          nodeSize: _nodeSize,
          nodeSpacing: _nodeSpacing,
          roundWidth: _roundWidth,
        ),
      ),
    );
  }

  Size _canvasSize() {
    final leafCount = _matchesInRound(roundMax);
    final height = leafCount * (_nodeSize + _nodeSpacing) + _nodeSpacing;
    final width = roundMax * _roundWidth + _roundWidth;
    return Size(width, height);
  }

  int _matchesInRound(int round) => 1 << (round - 1);
}

class _TreeMapPainter extends CustomPainter {
  final List<MatchDto> matches;
  final int roundMax;
  final String? selectedMatchId;
  final void Function(MatchDto match) onTapMatch;
  final double nodeSize;
  final double nodeSpacing;
  final double roundWidth;

  _TreeMapPainter({
    required this.matches,
    required this.roundMax,
    required this.selectedMatchId,
    required this.onTapMatch,
    required this.nodeSize,
    required this.nodeSpacing,
    required this.roundWidth,
  });

  final Map<String, Offset> _nodePositions = {};

  int _matchesInRound(int r) => 1 << (r - 1);

  List<MatchDto> _matchesByRound(int r) =>
      matches.where((m) => m.round == r).toList();

  List<MatchDto> _childrenOf(String fatherUuid) {
    final children = matches.where((m) => m.fatherId == fatherUuid).toList();
    children.sort((a, b) {
      final aC = a.childIndex;
      final bC = b.childIndex;
      if (aC != null && bC != null) {
        final by = aC.compareTo(bC);
        if (by != 0) return by;
      }
      return a.uuid.compareTo(b.uuid);
    });
    return children;
  }

  List<MatchDto> _leafOrder() {
    final root = matches.where((m) => m.fatherId == null).fold<MatchDto?>(null, (best, m) {
      if (best == null) return m;
      if (m.round < best.round) return m;
      return best;
    });
    if (root == null) return _matchesByRound(roundMax);

    final leaves = <MatchDto>[];
    void walk(MatchDto node) {
      if (node.round == roundMax) {
        leaves.add(node);
        return;
      }
      final children = _childrenOf(node.uuid);
      if (children.isEmpty) {
        leaves.add(node);
        return;
      }
      for (final c in children) {
        walk(c);
      }
    }

    walk(root);

    final onlyLeaves = leaves.where((m) => m.round == roundMax).toList();
    if (onlyLeaves.isNotEmpty) return onlyLeaves;
    return _matchesByRound(roundMax);
  }

  Map<String, Offset> _buildNodePositions() {
    final positions = <String, Offset>{};
    final cellH = nodeSize + nodeSpacing;

    final leafMatches = _leafOrder();
    for (var i = 0; i < leafMatches.length; i++) {
      final m = leafMatches[i];
      final x = (roundMax - m.round) * roundWidth + nodeSize / 2;
      final y = nodeSpacing + i * cellH + nodeSize / 2;
      positions[m.uuid] = Offset(x, y);
    }

    for (var r = roundMax - 1; r >= 1; r--) {
      final roundMatches = _matchesByRound(r);
      for (final m in roundMatches) {
        final children = _childrenOf(m.uuid);
        if (children.length == 2 &&
            positions.containsKey(children[0].uuid) &&
            positions.containsKey(children[1].uuid)) {
          final y1 = positions[children[0].uuid]!.dy;
          final y2 = positions[children[1].uuid]!.dy;
          final x = (roundMax - r) * roundWidth + nodeSize / 2;
          positions[m.uuid] = Offset(x, (y1 + y2) / 2);
        }
      }
    }

    return positions;
  }

  Color _nodeColor(MatchDto m, bool isTopHalf) {
    if (m.uuid == selectedMatchId) return Colors.amber;
    final isSfOrF = m.round <= 2;
    if (m.hasWinner && m.p1Wins == true && m.p2Wins == false || m.p2Wins == true && m.p1Wins == false) {
      if (isSfOrF) return Colors.green.shade400;
      return isTopHalf ? Colors.red.shade300 : Colors.blue.shade300;
    }
    if (isSfOrF) return Colors.grey.shade400;
    return isTopHalf ? Colors.red.shade100 : Colors.blue.shade100;
  }

  @override
  void paint(Canvas canvas, Size size) {
    _nodePositions.clear();

    _nodePositions.addAll(_buildNodePositions());

    // Disegna linee di connessione
    final linePaint = Paint()
      ..color = Colors.grey.shade300
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    for (final m in matches) {
      if (m.fatherId == null) continue;
      final from = _nodePositions[m.uuid];
      final to = _nodePositions[m.fatherId!];
      if (from == null || to == null) continue;
      canvas.drawLine(from, to, linePaint);
    }

    // Disegna nodi
    for (final m in matches) {
      final pos = _nodePositions[m.uuid];
      if (pos == null) continue;

      final totalLeafCount = _matchesInRound(roundMax);
      final isTopHalf = _isTopHalf(m, totalLeafCount);
      final isSfOrF = m.round <= 2;
      final color = _nodeColor(m, isTopHalf);
      final radius = isSfOrF ? nodeSize * 0.35 : nodeSize / 2;

      final paint = Paint()..color = color..style = PaintingStyle.fill;
      canvas.drawCircle(pos, radius, paint);

      if (m.uuid == selectedMatchId) {
        final borderPaint = Paint()
          ..color = Colors.amber.shade800
          ..strokeWidth = 1.5
          ..style = PaintingStyle.stroke;
        canvas.drawCircle(pos, radius + 1.5, borderPaint);
      }
    }
  }

  bool _isTopHalf(MatchDto m, int totalLeaves) {
    final pos = _nodePositions[m.uuid];
    if (pos == null) return true;
    final totalH = totalLeaves * (nodeSize + nodeSpacing);
    return pos.dy < totalH / 2;
  }

  @override
  bool hitTest(Offset position) => true;

  @override
  bool shouldRepaint(_TreeMapPainter old) =>
      old.selectedMatchId != selectedMatchId || old.matches != matches;
}

class TournamentTreeMapInteractive extends StatefulWidget {
  final List<MatchDto> matches;
  final int roundMax;
  final String? selectedMatchId;
  final void Function(MatchDto match) onTapMatch;

  const TournamentTreeMapInteractive({
    super.key,
    required this.matches,
    required this.roundMax,
    this.selectedMatchId,
    required this.onTapMatch,
  });

  @override
  State<TournamentTreeMapInteractive> createState() => _TournamentTreeMapInteractiveState();
}

class _TournamentTreeMapInteractiveState extends State<TournamentTreeMapInteractive> {
  static const double _nodeSize = 10;
  static const double _nodeSpacing = 6;
  static const double _roundWidth = 36;
  static const double _viewHeight = 140;

  final ScrollController _hScroll = ScrollController();
  final ScrollController _vScroll = ScrollController();

  @override
  void didUpdateWidget(TournamentTreeMapInteractive old) {
    super.didUpdateWidget(old);
    if (old.selectedMatchId != widget.selectedMatchId && widget.selectedMatchId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToSelected());
    }
  }

  void _scrollToSelected() {
    final id = widget.selectedMatchId;
    if (id == null) return;
    final match = widget.matches.firstWhere((m) => m.uuid == id, orElse: () => widget.matches.first);

    final painter = _TreeMapPainter(
      matches: widget.matches,
      roundMax: widget.roundMax,
      selectedMatchId: widget.selectedMatchId,
      onTapMatch: widget.onTapMatch,
      nodeSize: _nodeSize,
      nodeSpacing: _nodeSpacing,
      roundWidth: _roundWidth,
    );
    final positions = painter._buildNodePositions();

    final pos = positions[match.uuid];
    if (pos == null) return;

    // Scroll orizzontale: centra il nodo nel viewport
    if (_hScroll.hasClients) {
      final targetX = (pos.dx - _hScroll.position.viewportDimension / 2).clamp(
        0.0, _hScroll.position.maxScrollExtent,
      );
      _hScroll.animateTo(targetX, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    }

    // Scroll verticale: centra il nodo nel viewport
    if (_vScroll.hasClients) {
      final targetY = (pos.dy - _viewHeight / 2).clamp(
        0.0, _vScroll.position.maxScrollExtent,
      );
      _vScroll.animateTo(targetY, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    }
  }

  @override
  void dispose() {
    _hScroll.dispose();
    _vScroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _viewHeight,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        controller: _hScroll,
        child: SingleChildScrollView(
          scrollDirection: Axis.vertical,
          controller: _vScroll,
          child: _TappableTreeMap(
            matches: widget.matches,
            roundMax: widget.roundMax,
            selectedMatchId: widget.selectedMatchId,
            onTapMatch: widget.onTapMatch,
          ),
        ),
      ),
    );
  }
}

class _TappableTreeMap extends StatefulWidget {
  final List<MatchDto> matches;
  final int roundMax;
  final String? selectedMatchId;
  final void Function(MatchDto match) onTapMatch;

  const _TappableTreeMap({
    required this.matches,
    required this.roundMax,
    required this.selectedMatchId,
    required this.onTapMatch,
  });

  @override
  State<_TappableTreeMap> createState() => _TappableTreeMapState();
}

class _TappableTreeMapState extends State<_TappableTreeMap> {
  static const double _nodeSize = 10;
  static const double _nodeSpacing = 6;
  static const double _roundWidth = 36;

  final Map<String, Rect> _hitRects = {};

  int _matchesInRound(int r) => 1 << (r - 1);

  Size get _canvasSize {
    final leafCount = _matchesInRound(widget.roundMax);
    final height = leafCount * (_nodeSize + _nodeSpacing) + _nodeSpacing;
    final width = widget.roundMax * _roundWidth + _roundWidth;
    return Size(width, height);
  }

  void _buildHitRects(Map<String, Offset> positions) {
    _hitRects.clear();
    for (final entry in positions.entries) {
      final center = entry.value;
      _hitRects[entry.key] = Rect.fromCenter(
        center: center,
        width: _nodeSize * 2.5,
        height: _nodeSize * 2.5,
      );
    }
  }

  Map<String, Offset> _computePositions() {
    final painter = _TreeMapPainter(
      matches: widget.matches,
      roundMax: widget.roundMax,
      selectedMatchId: widget.selectedMatchId,
      onTapMatch: widget.onTapMatch,
      nodeSize: _nodeSize,
      nodeSpacing: _nodeSpacing,
      roundWidth: _roundWidth,
    );
    return painter._buildNodePositions();
  }

  @override
  Widget build(BuildContext context) {
    final painter = _TreeMapPainter(
      matches: widget.matches,
      roundMax: widget.roundMax,
      selectedMatchId: widget.selectedMatchId,
      onTapMatch: widget.onTapMatch,
      nodeSize: _nodeSize,
      nodeSpacing: _nodeSpacing,
      roundWidth: _roundWidth,
    );

    return GestureDetector(
      onTapUp: (details) {
        final positions = _computePositions();
        _buildHitRects(positions);
        final tap = details.localPosition;
        for (final entry in _hitRects.entries) {
          if (entry.value.contains(tap)) {
            final match = widget.matches.firstWhere(
              (m) => m.uuid == entry.key,
              orElse: () => widget.matches.first,
            );
            widget.onTapMatch(match);
            break;
          }
        }
      },
      child: CustomPaint(
        size: _canvasSize,
        painter: painter,
      ),
    );
  }
}
